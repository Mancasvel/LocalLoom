/**
 * Utilidades de comunicación para LocalLoom - Manifest V3
 * Simplificado para trabajar con chrome.alarms en lugar de keep-alive manual
 */

/**
 * Enviar mensaje al background script
 */
export async function sendMessage(message, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout: El mensaje tardó demasiado en responder'));
    }, timeout);
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.error) {
          reject(new Error(response.error));
          return;
        }
        
        resolve(response || {});
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Enviar mensaje a content script de la pestaña activa
 */
export async function sendMessageToTab(message, tabId = null) {
  try {
    // Si no se especifica tabId, usar la pestaña activa
    if (tabId === null) {
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      tabId = activeTab.id;
    }
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        resolve(response || {});
      });
    });
  } catch (error) {
    throw new Error(`Error enviando mensaje a tab: ${error.message}`);
  }
}

/**
 * Configurar listener para mensajes del background
 */
export function setupMessageListener(callback) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      const result = callback(message, sender);
      
      // Si es una promesa, manejarla apropiadamente
      if (result && typeof result.then === 'function') {
        result
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ error: error.message }));
        return true; // Respuesta asíncrona
      }
      
      // Respuesta síncrona
      if (result !== undefined) {
        sendResponse(result);
      }
    } catch (error) {
      console.error('Error en message listener:', error);
      sendResponse({ error: error.message });
    }
  });
}

/**
 * Obtener información de la pestaña activa
 */
export async function getActiveTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true 
    });
    
    return activeTab;
  } catch (error) {
    throw new Error(`Error obteniendo pestaña activa: ${error.message}`);
  }
}

/**
 * Obtener texto seleccionado de la pestaña activa
 */
export async function getSelectedTextFromActiveTab() {
  try {
    const response = await sendMessageToTab({ 
      type: 'GET_SELECTED_TEXT' 
    });
    
    return response;
  } catch (error) {
    console.error('Error obteniendo texto seleccionado:', error);
    return { text: '', success: false, error: error.message };
  }
}

/**
 * Inyectar script en la pestaña activa
 */
export async function injectScript(scriptFunction, args = []) {
  try {
    const activeTab = await getActiveTab();
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      function: scriptFunction,
      args: args
    });
    
    return results[0]?.result;
  } catch (error) {
    throw new Error(`Error inyectando script: ${error.message}`);
  }
}

/**
 * Verificar si la extensión tiene permisos para la URL actual
 */
export async function checkPermissions() {
  try {
    const activeTab = await getActiveTab();
    const url = new URL(activeTab.url);
    
    // Verificar protocolo válido
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) {
      return {
        hasPermissions: false,
        reason: 'protocol_not_supported',
        protocol: url.protocol
      };
    }
    
    // Verificar páginas especiales de Chrome
    if (url.hostname === 'chrome.google.com' || 
        url.protocol === 'chrome:' || 
        url.protocol === 'chrome-extension:') {
      return {
        hasPermissions: false,
        reason: 'chrome_page',
        url: url.href
      };
    }
    
    return {
      hasPermissions: true,
      url: url.href,
      domain: url.hostname
    };
  } catch (error) {
    return {
      hasPermissions: false,
      reason: 'error',
      error: error.message
    };
  }
}

/**
 * Notificar cambio de estado a todas las partes de la extensión
 */
export async function broadcastStateChange(type, payload) {
  try {
    // Notificar al background
    await sendMessage({
      type: 'STATE_CHANGE',
      payload: { changeType: type, data: payload }
    });
    
    // Notificar a content script si es posible
    try {
      await sendMessageToTab({
        type: 'STATE_CHANGE', 
        payload: { changeType: type, data: payload }
      });
    } catch (error) {
      // Ignorar si no hay content script
      console.log('No se pudo notificar a content script:', error.message);
    }
    
  } catch (error) {
    console.error('Error en broadcast:', error);
  }
}

/**
 * Manejar errores de comunicación de manera consistente
 */
export function handleCommunicationError(error, context = '') {
  console.error(`Error de comunicación${context ? ` en ${context}` : ''}:`, error);
  
  let userMessage = 'Error de comunicación con la extensión';
  
  if (error.message.includes('Extension context invalidated')) {
    userMessage = 'La extensión necesita ser recargada. Por favor recarga la página.';
  } else if (error.message.includes('Receiving end does not exist')) {
    userMessage = 'El componente de destino no está disponible.';
  } else if (error.message.includes('Timeout')) {
    userMessage = 'La operación tardó demasiado. Inténtalo de nuevo.';
  }
  
  return {
    error: error.message,
    userMessage,
    context,
    timestamp: Date.now()
  };
}

/**
 * Crear un wrapper para mensajes con retry automático
 */
export function createRetryableMessage(message, maxRetries = 3, delay = 1000) {
  return async function executeWithRetry() {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await sendMessage(message);
      } catch (error) {
        lastError = error;
        
        console.warn(`Intento ${attempt} fallido:`, error.message);
        
        // No hacer retry en ciertos errores
        if (error.message.includes('Extension context invalidated')) {
          throw error;
        }
        
        // Esperar antes del siguiente intento
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  };
}

console.log('LocalLoom messaging utilities cargadas - Manifest V3'); 