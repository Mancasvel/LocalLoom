// Background Service Worker para LocalLoom
// Maneja WebLLM y comunicación entre popup y content scripts

import * as webllm from '@mlc-ai/web-llm';

// Estado global del service worker
let llmEngine = null;
let modelLoaded = false;
let modelLoading = false;
let currentModel = null;

// Configuraciones de modelos disponibles (actualizadas)
const AVAILABLE_MODELS = {
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': {
    name: 'TinyLlama 1.1B',
    size: '~600MB',
    description: 'Modelo ligero y rápido para tareas básicas'
  },
  'Llama-2-7b-chat-hf-q4f16_1-MLC': {
    name: 'Llama 2 7B',
    size: '~4GB',
    description: 'Modelo más capaz pero requiere más memoria'
  },
  'gemma-2b-it-q4f16_1-MLC': {
    name: 'Gemma 2B',
    size: '~1.5GB',
    description: 'Modelo equilibrado de Google'
  }
};

// Prompts para diferentes tareas
const TASK_PROMPTS = {
  summarize: 'Resume el siguiente texto de manera concisa y clara:\n\n',
  rewrite: 'Reescribe el siguiente texto mejorando su claridad y estructura:\n\n',
  counter: 'Proporciona un contrargumento balanceado al siguiente texto:\n\n',
  question: 'Genera una pregunta reflexiva e interesante basada en el siguiente texto:\n\n'
};

// Escuchar mensajes de popup y content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'LOAD_MODEL':
      handleLoadModel(sendResponse);
      return true; // Respuesta asíncrona
      
    case 'PROCESS_TEXT':
      handleProcessText(message.payload, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'GET_MODEL_STATUS':
      handleGetModelStatus(sendResponse);
      break;
      
    case 'UNLOAD_MODEL':
      handleUnloadModel(sendResponse);
      break;
      
    case 'SAVE_RESULT':
      handleSaveResult(message.payload, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'TEXT_SELECTED':
      handleTextSelected(message.payload, sender);
      break;
      
    case 'QUICK_PROCESS':
      handleQuickProcess(message.payload, sender, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'CONTENT_SCRIPT_READY':
      handleContentScriptReady(message.payload, sender);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Cargar modelo LLM
 */
async function handleLoadModel(sendResponse) {
  if (modelLoaded) {
    sendResponse({ 
      success: true, 
      message: 'Modelo ya está cargado',
      model: currentModel 
    });
    return;
  }
  
  if (modelLoading) {
    sendResponse({ 
      success: false, 
      error: 'Modelo ya se está cargando' 
    });
    return;
  }
  
  try {
    modelLoading = true;
    
    console.log('Inicializando WebLLM...');
    
    // Usar el modelo más ligero por defecto (actualizado)
    const modelId = 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC';
    currentModel = modelId;
    
    // Inicializar MLCEngine con la nueva API
    llmEngine = new webllm.MLCEngine();
    
    // Configurar callbacks de progreso
    const initProgressCallback = (progress) => {
      console.log('Model loading progress:', progress);
      
      // Notificar progreso a todas las páginas abiertas
      notifyAllTabs('MODEL_LOADING_PROGRESS', { 
        progress: progress.progress || 0,
        text: progress.text || 'Cargando modelo...'
      });
    };
    
    // Recargar el modelo con la nueva API
    await llmEngine.reload(modelId, undefined, {
      initProgressCallback: initProgressCallback
    });
    
    modelLoaded = true;
    modelLoading = false;
    
    console.log('Modelo cargado exitosamente:', modelId);
    
    // Notificar a todas las páginas que el modelo está listo
    notifyAllTabs('MODEL_LOADED', { 
      model: modelId,
      name: AVAILABLE_MODELS[modelId]?.name || modelId
    });
    
    sendResponse({ 
      success: true, 
      message: 'Modelo cargado exitosamente',
      model: currentModel
    });
    
  } catch (error) {
    console.error('Error cargando modelo:', error);
    modelLoading = false;
    modelLoaded = false;
    llmEngine = null;
    
    sendResponse({ 
      success: false, 
      error: error.message || 'Error desconocido cargando modelo'
    });
  }
}

/**
 * Procesar texto con LLM
 */
async function handleProcessText(payload, sendResponse) {
  const { text, task = 'summarize' } = payload;
  
  if (!modelLoaded || !llmEngine) {
    sendResponse({ 
      success: false, 
      error: 'Modelo no está cargado. Carga el modelo primero.' 
    });
    return;
  }
  
  if (!text || !text.trim()) {
    sendResponse({ 
      success: false, 
      error: 'No se proporcionó texto para procesar' 
    });
    return;
  }
  
  try {
    console.log(`Procesando texto con tarea: ${task}`);
    
    const prompt = TASK_PROMPTS[task] || TASK_PROMPTS.summarize;
    const fullPrompt = prompt + text.trim();
    
    // Procesar con el modelo usando la nueva API
    const response = await llmEngine.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 256,
      top_p: 0.9
    });
    
    const result = response.choices[0].message.content;
    console.log('Respuesta generada:', result);
    
    sendResponse({ 
      success: true, 
      result: result.trim(),
      task: task,
      originalText: text
    });
    
  } catch (error) {
    console.error('Error procesando texto:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Error procesando texto'
    });
  }
}

/**
 * Obtener estado del modelo
 */
function handleGetModelStatus(sendResponse) {
  sendResponse({
    loaded: modelLoaded,
    loading: modelLoading,
    model: currentModel,
    availableModels: AVAILABLE_MODELS
  });
}

/**
 * Descargar modelo
 */
async function handleUnloadModel(sendResponse) {
  try {
    if (llmEngine) {
      // Limpiar el engine
      llmEngine = null;
    }
    
    modelLoaded = false;
    modelLoading = false;
    currentModel = null;
    
    // Notificar a todas las páginas
    notifyAllTabs('MODEL_UNLOADED', {});
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Error descargando modelo:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Guardar resultado en IndexedDB
 */
async function handleSaveResult(payload, sendResponse) {
  try {
    // Importar dinámicamente las utilidades de storage
    const { saveResult } = await import('../utils/storage.js');
    
    const savedId = await saveResult({
      originalText: payload.originalText,
      result: payload.result,
      task: payload.task,
      timestamp: payload.timestamp || Date.now(),
      url: payload.url || 'unknown'
    });
    
    console.log('Resultado guardado con ID:', savedId);
    
    sendResponse({ 
      success: true, 
      id: savedId 
    });
    
  } catch (error) {
    console.error('Error guardando resultado:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Manejar texto seleccionado
 */
function handleTextSelected(payload, sender) {
  console.log('Texto seleccionado:', payload.text.substring(0, 50) + '...');
  
  // Aquí podrías agregar lógica adicional, como:
  // - Guardar en historial de selecciones
  // - Análisis automático del texto
  // - Notificaciones
}

/**
 * Procesamiento rápido desde content script
 */
async function handleQuickProcess(payload, sender, sendResponse) {
  if (!modelLoaded || !llmEngine) {
    sendResponse({ 
      success: false, 
      error: 'Modelo no está cargado' 
    });
    return;
  }
  
  try {
    // Usar tarea por defecto para procesamiento rápido
    const prompt = TASK_PROMPTS.summarize + payload.text.trim();
    
    const response = await llmEngine.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 128, // Respuesta más corta para acción rápida
      top_p: 0.9
    });
    
    const result = response.choices[0].message.content;
    
    // Enviar resultado de vuelta al content script para mostrar en tooltip
    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'INJECT_RESULT',
      payload: {
        result: result.trim(),
        position: payload.position
      }
    });
    
    sendResponse({ 
      success: true, 
      result: result.trim() 
    });
    
  } catch (error) {
    console.error('Error en procesamiento rápido:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Content script está listo
 */
function handleContentScriptReady(payload, sender) {
  console.log('Content script listo en:', payload.url);
  
  // Enviar estado actual del modelo al content script
  chrome.tabs.sendMessage(sender.tab.id, {
    type: 'MODEL_STATUS_UPDATE',
    payload: {
      loaded: modelLoaded,
      loading: modelLoading,
      model: currentModel
    }
  });
}

/**
 * Notificar a todas las páginas abiertas
 */
async function notifyAllTabs(messageType, payload) {
  try {
    const tabs = await chrome.tabs.query({});
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: messageType,
        payload: payload
      }).catch(() => {
        // Ignorar errores si la página no tiene content script
      });
    });
  } catch (error) {
    console.error('Error notificando tabs:', error);
  }
}

/**
 * Configurar menu contextual
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'localloom-process',
    title: 'Procesar con LocalLoom',
    contexts: ['selection']
  });
});

/**
 * Manejar clicks en menu contextual
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'localloom-process' && info.selectionText) {
    // Obtener coordenadas del cursor (aproximadas)
    const position = { x: 100, y: 100 };
    
    if (modelLoaded && llmEngine) {
      // Procesar directamente
      await handleQuickProcess({
        text: info.selectionText,
        position: position
      }, { tab }, () => {});
    } else {
      // Mostrar mensaje de que el modelo no está cargado
      chrome.tabs.sendMessage(tab.id, {
        type: 'INJECT_RESULT',
        payload: {
          result: 'LocalLoom: Modelo no está cargado. Ábrelo desde el popup para cargar el modelo primero.',
          position: position
        }
      });
    }
  }
});

// Log de inicialización
console.log('LocalLoom background service worker initialized');

// Mantener el service worker activo
chrome.runtime.onStartup.addListener(() => {
  console.log('LocalLoom startup');
});

// Limpiar recursos al suspender
self.addEventListener('beforeunload', () => {
  if (llmEngine) {
    llmEngine = null;
  }
}); 