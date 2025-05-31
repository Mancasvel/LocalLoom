/**
 * Envía un mensaje usando Chrome runtime messaging
 * @param {Object} message - El mensaje a enviar
 * @returns {Promise} - Promesa que resuelve con la respuesta
 */
export async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Envía un mensaje a un tab específico
 * @param {number} tabId - ID del tab
 * @param {Object} message - El mensaje a enviar
 * @returns {Promise} - Promesa que resuelve con la respuesta
 */
export async function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Obtiene el tab activo
 * @returns {Promise<Object>} - Tab activo
 */
export async function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (tabs.length === 0) {
        reject(new Error('No active tab found'));
      } else {
        resolve(tabs[0]);
      }
    });
  });
}

/**
 * Establece un listener para mensajes
 * @param {Function} callback - Función callback para manejar mensajes
 */
export function addMessageListener(callback) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Llamar al callback y manejar respuestas asíncronas
    const result = callback(message, sender, sendResponse);
    
    // Si el callback retorna una promesa, manejarla
    if (result instanceof Promise) {
      result
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Indica que se enviará una respuesta asíncrona
    }
    
    return false;
  });
} 