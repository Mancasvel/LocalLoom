// LocalLoom Service Worker - Manifest V3
// Usa chrome.alarms para mantener el SW activo de forma aceptable por Chrome
// NO usa setInterval ni loops infinitos - esos son detectados y terminados por Chrome

import * as webllm from '@mlc-ai/web-llm';

// ============================================================================
// ESTADO GLOBAL DEL SERVICE WORKER
// ============================================================================
// IMPORTANTE: Este estado se pierde cuando Chrome desactiva el SW
// Por eso persistimos todo en chrome.storage y lo restauramos cuando se reactiva

let chatClient = null;           // Cliente WebLLM (se pierde al desactivar SW)
let modelLoaded = false;         // Estado en memoria (se restaura desde storage)
let modelLoading = false;        // Estado temporal
let currentModelId = null;       // ID del modelo cargado
let modelRegistry = null;

// Configuraciones
const DEFAULT_MODEL = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC";
const KEEPALIVE_ALARM = "localloom-keepalive";
const ALARM_PERIOD_MINUTES = 1; // Mínimo permitido por Chrome

// Prompts para diferentes tareas de procesamiento
const TASK_PROMPTS = {
  summarize: 'Resume el siguiente texto de manera concisa y clara:\n\n',
  rewrite: 'Reescribe el siguiente texto mejorando su claridad y estructura:\n\n',
  counter_argument: 'Proporciona un contrargumento balanceado al siguiente texto:\n\n',
  question: 'Genera una pregunta reflexiva e interesante basada en el siguiente texto:\n\n'
};

// ============================================================================
// EVENTOS DEL SERVICE WORKER LIFECYCLE
// ============================================================================

// 🚀 INSTALACIÓN: Se ejecuta cuando se instala/actualiza la extensión
self.addEventListener('install', (event) => {
  console.log('🚀 LocalLoom SW: Instalando...');
  
  // Activar inmediatamente sin esperar
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      initializeAlarms(),
      loadModelRegistry()
    ])
  );
});

// ✅ ACTIVACIÓN: Se ejecuta cuando el SW se activa (primera vez o reactivación)
self.addEventListener('activate', (event) => {
  console.log('✅ LocalLoom SW: Activando...');
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),      // Tomar control de todas las pestañas
      restoreModelState(),       // Restaurar estado desde storage
      initializeAlarms()         // Asegurar que las alarmas están configuradas
    ])
  );
});

// Manejar cuando el SW va a ser destruido
self.addEventListener('beforeunload', () => {
  console.log('⚠️ Service Worker se va a desactivar');
  saveModelState();
});

// ============================================================================
// SISTEMA DE ALARMAS - CORAZÓN DEL KEEPALIVE
// ============================================================================

/**
 * 🔔 INICIALIZAR ALARMAS
 * Chrome.alarms es la forma CORRECTA de mantener un SW "activo"
 * No mantiene el SW corriendo 24/7, pero lo despierta periódicamente
 */
async function initializeAlarms() {
  try {
    // Limpiar alarmas existentes para evitar duplicados
    await chrome.alarms.clear(KEEPALIVE_ALARM);
    
    // Crear alarma que se repite cada minuto
    // IMPORTANTE: 1 minuto es el mínimo permitido por Chrome
    await chrome.alarms.create(KEEPALIVE_ALARM, {
      delayInMinutes: ALARM_PERIOD_MINUTES,
      periodInMinutes: ALARM_PERIOD_MINUTES
    });
    
    console.log(`⏰ Alarma ${KEEPALIVE_ALARM} configurada cada ${ALARM_PERIOD_MINUTES} minuto(s)`);
    
  } catch (error) {
    console.error('❌ Error configurando alarmas:', error);
  }
}

/**
 * 🔔 HANDLER DE ALARMAS
 * Se ejecuta cada vez que la alarma se dispara
 * Esto "despierta" el SW si estaba dormido
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) {
    console.log('💓 LocalLoom SW: Keepalive ping -', new Date().toISOString());
    
    // Realizar tareas de mantenimiento
    await performMaintenanceTasks();
    
    // Actualizar badge con estado del modelo
    await updateBadge();
    
    // Log del estado actual
    console.log('📊 Estado SW:', {
      modelLoaded,
      modelLoading,
      currentModelId,
      chatClientExists: !!chatClient
    });
  }
});

/**
 * 🔧 TAREAS DE MANTENIMIENTO
 * Se ejecutan en cada ping de la alarma
 */
async function performMaintenanceTasks() {
  try {
    // 1. Verificar y sincronizar estado persistente
    await syncModelState();
    
    // 2. Verificar si el modelo sigue en memoria
    if (modelLoaded && !chatClient) {
      console.log('⚠️ Modelo marcado como cargado pero chatClient no existe');
      // El SW se reactivó, pero perdimos el cliente en memoria
      // Marcamos como no cargado para forzar recarga si es necesario
      modelLoaded = false;
      await saveModelState();
    }
    
    // 3. Limpiar storage antiguo si es necesario
    await cleanupOldStorage();
    
  } catch (error) {
    console.error('❌ Error en tareas de mantenimiento:', error);
  }
}

// ============================================================================
// PERSISTENCIA DE ESTADO
// ============================================================================

/**
 * 💾 GUARDAR ESTADO DEL MODELO
 * Persiste el estado en chrome.storage para sobrevivir reinicios del SW
 */
async function saveModelState() {
  const state = {
    modelLoaded,
    modelLoading,
    currentModelId,
    timestamp: Date.now(),
    version: '1.0'
  };
  
  try {
    await chrome.storage.local.set({ 'localloom_model_state': state });
    console.log('💾 Estado guardado:', state);
  } catch (error) {
    console.error('❌ Error guardando estado:', error);
  }
}

/**
 * 🔄 RESTAURAR ESTADO DEL MODELO
 * Restaura el estado desde chrome.storage cuando el SW se reactiva
 */
async function restoreModelState() {
  try {
    const result = await chrome.storage.local.get(['localloom_model_state']);
    const state = result.localloom_model_state;
    
    if (state) {
      // Solo restaurar si es reciente (menos de 30 minutos)
      const timeDiff = Date.now() - state.timestamp;
      const maxAge = 30 * 60 * 1000; // 30 minutos
      
      if (timeDiff < maxAge && state.version === '1.0') {
        modelLoaded = state.modelLoaded || false;
        modelLoading = state.modelLoading || false;
        currentModelId = state.currentModelId || null;
        
        console.log('🔄 Estado restaurado:', state);
        
        // IMPORTANTE: NO intentamos restaurar chatClient aquí
        // El cliente WebLLM debe ser recreado desde cero si es necesario
        if (modelLoaded) {
          console.log('⚠️ Modelo marcado como cargado, pero chatClient debe recrearse');
          // Lo marcaremos como no cargado para forzar recarga
          modelLoaded = false;
          await saveModelState();
        }
        
        return state;
      } else {
        console.log('⏰ Estado expirado o versión incompatible, iniciando limpio');
      }
    }
  } catch (error) {
    console.error('❌ Error restaurando estado:', error);
  }
  
  // Estado por defecto
  modelLoaded = false;
  modelLoading = false;
  currentModelId = null;
  await saveModelState();
  
  return null;
}

/**
 * 🔄 SINCRONIZAR ESTADO
 * Verifica que el estado en memoria coincida con el storage
 */
async function syncModelState() {
  try {
    const stored = await chrome.storage.local.get(['localloom_model_state']);
    const storedState = stored.localloom_model_state;
    
    if (storedState) {
      const inMemory = { modelLoaded, modelLoading, currentModelId };
      const inStorage = { 
        modelLoaded: storedState.modelLoaded, 
        modelLoading: storedState.modelLoading, 
        currentModelId: storedState.currentModelId 
      };
      
      // Si hay diferencias, usar el estado en storage (más confiable)
      if (JSON.stringify(inMemory) !== JSON.stringify(inStorage)) {
        console.log('🔄 Sincronizando estado:', { inMemory, inStorage });
        modelLoaded = storedState.modelLoaded || false;
        modelLoading = storedState.modelLoading || false;
        currentModelId = storedState.currentModelId || null;
      }
    }
  } catch (error) {
    console.error('❌ Error sincronizando estado:', error);
  }
}

// ============================================================================
// HANDLERS DE MENSAJES
// ============================================================================

/**
 * 📨 LISTENER PRINCIPAL DE MENSAJES
 * Chrome despierta el SW automáticamente cuando llega un mensaje
 * Esta es otra forma de "mantener activo" el SW - a través de uso real
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 SW: Mensaje recibido:', message.type);
  
  // IMPORTANTE: Devolver true para respuestas asíncronas
  // Esto mantiene el canal abierto mientras procesamos
  
  switch (message.type) {
    case 'LOAD_MODEL':
      handleLoadModel(message.payload, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'PROCESS_TEXT':
      handleProcessText(message.payload, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'GET_MODEL_STATUS':
      handleGetModelStatus(sendResponse);
      return true; // Respuesta asíncrona
      
    case 'UNLOAD_MODEL':
      handleUnloadModel(sendResponse);
      return true; // Respuesta asíncrona
      
    case 'SAVE_RESULT':
      handleSaveResult(message.payload, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'GET_SAVED_RESULTS':
      handleGetSavedResults(message.payload, sendResponse);
      return true; // Respuesta asíncrona
      
    case 'CHECK_WEBGPU_SUPPORT':
      handleCheckWebGPUSupport(sendResponse);
      return true; // Respuesta asíncrona
      
    default:
      console.log('❓ Tipo de mensaje desconocido:', message.type);
      sendResponse({ error: 'Tipo de mensaje desconocido' });
      return false; // Respuesta síncrona
  }
});

// ============================================================================
// IMPLEMENTACIÓN DE HANDLERS
// ============================================================================

/**
 * 🚀 CARGAR MODELO WebLLM
 */
async function handleLoadModel(payload = {}, sendResponse) {
  console.log('🚀 === INICIANDO CARGA DE MODELO ===');
  
  // Verificar si ya está cargado
  if (modelLoaded && chatClient) {
    console.log('✅ Modelo ya está cargado');
    await saveModelState();
    sendResponse({ 
      success: true, 
      message: 'Modelo ya está cargado',
      modelId: currentModelId,
      status: 'loaded'
    });
    return;
  }
  
  // Verificar si ya está cargando
  if (modelLoading) {
    console.log('⏳ Modelo ya se está cargando');
    sendResponse({ 
      success: false, 
      error: 'Modelo ya se está cargando. Por favor espera...',
      status: 'loading'
    });
    return;
  }
  
  try {
    modelLoading = true;
    await saveModelState();
    
    const modelId = payload.modelId || DEFAULT_MODEL;
    
    console.log('📋 Modelo a cargar:', modelId);
    console.log('🔍 WebLLM disponible:', !!webllm);
    
    // Verificar WebLLM
    if (!webllm?.ChatWorkerClient) {
      throw new Error('❌ WebLLM ChatWorkerClient no disponible');
    }
    
    // Crear cliente
    console.log('🔧 Creando ChatWorkerClient...');
    chatClient = new webllm.ChatWorkerClient();
    
    // Callback de progreso simplificado
    let lastProgress = 0;
    const progressCallback = (progress) => {
      const progressPercent = Math.round((progress.progress || 0) * 100);
      
      if (progressPercent >= lastProgress + 10) {
        console.log(`📊 Progreso: ${progressPercent}% - ${progress.text || 'Cargando...'}`);
        lastProgress = progressPercent;
        
        // Notificar a tabs activas
        notifyAllTabs('MODEL_LOADING_PROGRESS', { 
          progress: progressPercent,
          text: progress.text || `Cargando... ${progressPercent}%`,
          modelId
        });
      }
    };
    
    // Notificar inicio
    notifyAllTabs('MODEL_LOADING_STARTED', { 
      modelId,
      modelName: 'TinyLlama 1.1B Chat',
      message: 'Iniciando descarga...'
    });
    
    // CARGAR MODELO
    console.log('📥 Cargando modelo...');
    console.time('⏱️ Tiempo de carga');
    
    await chatClient.reload(modelId, undefined, { progressCallback });
    
    console.timeEnd('⏱️ Tiempo de carga');
    
    // Verificar carga exitosa
    if (!chatClient.chat?.completions?.create) {
      throw new Error('❌ API de chat no disponible después de cargar');
    }
    
    // Marcar como exitoso
    modelLoaded = true;
    modelLoading = false;
    currentModelId = modelId;
    await saveModelState();
    
    console.log('🎉 === MODELO CARGADO EXITOSAMENTE ===');
    
    // Notificar éxito
    notifyAllTabs('MODEL_LOADED', { 
      modelId,
      modelName: 'TinyLlama 1.1B Chat',
      status: 'ready'
    });
    
    sendResponse({ 
      success: true, 
      message: 'Modelo cargado exitosamente',
      modelId: currentModelId,
      status: 'loaded'
    });
    
  } catch (error) {
    console.error('❌ Error cargando modelo:', error);
    
    modelLoading = false;
    modelLoaded = false;
    chatClient = null;
    currentModelId = null;
    await saveModelState();
    
    let userError = error.message;
    if (error.message.includes('Failed to fetch')) {
      userError = 'Error de red. Verifica tu conexión e intenta de nuevo.';
    } else if (error.message.includes('memory')) {
      userError = 'Memoria insuficiente. Cierra otras pestañas e intenta de nuevo.';
    }
    
    notifyAllTabs('MODEL_LOADING_ERROR', { error: userError });
    
    sendResponse({ 
      success: false, 
      error: userError,
      status: 'error'
    });
  }
}

/**
 * 📝 PROCESAR TEXTO
 */
async function handleProcessText(payload, sendResponse) {
  const { text, task = 'summarize', options = {} } = payload;
  
  if (!modelLoaded || !chatClient) {
    sendResponse({ 
      success: false, 
      error: 'Modelo no está cargado. Carga el modelo primero.',
      needsModelLoad: true
    });
    return;
  }
  
  if (!text?.trim()) {
    sendResponse({ 
      success: false, 
      error: 'No se proporcionó texto para procesar' 
    });
    return;
  }
  
  try {
    console.log(`📝 Procesando texto con tarea: ${task}`);
    
    const prompt = TASK_PROMPTS[task] || TASK_PROMPTS.summarize;
    const fullPrompt = prompt + text.trim();
    
    const response = await chatClient.chat.completions.create({
      messages: [{ role: "user", content: fullPrompt }],
      max_tokens: options.maxTokens || 256,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9
    });
    
    const resultText = response.choices[0]?.message?.content || 'Error: No se pudo generar respuesta';
    
    sendResponse({
      success: true,
      result: resultText.trim(),
      originalText: text,
      task: task,
      modelId: currentModelId,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Error procesando texto:', error);
    
    sendResponse({ 
      success: false, 
      error: error.message || 'Error procesando texto'
    });
  }
}

/**
 * 📊 OBTENER ESTADO DEL MODELO
 */
async function handleGetModelStatus(sendResponse) {
  // Sincronizar estado antes de responder
  await syncModelState();
  
  const status = {
    isLoaded: modelLoaded,
    isLoading: modelLoading,
    modelId: currentModelId,
    hasWebGPU: await checkWebGPUSupport(),
    swActive: true, // Si llegamos aquí, el SW está activo
    lastUpdate: Date.now()
  };
  
  sendResponse(status);
}

/**
 * 🗑️ DESCARGAR MODELO
 */
async function handleUnloadModel(sendResponse) {
  try {
    chatClient = null; // El GC se encargará de limpiar
    modelLoaded = false;
    modelLoading = false;
    currentModelId = null;
    
    await saveModelState();
    
    notifyAllTabs('MODEL_UNLOADED', {});
    
    sendResponse({ 
      success: true, 
      message: 'Modelo descargado exitosamente' 
    });
    
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * 💾 GUARDAR RESULTADO
 */
async function handleSaveResult(payload, sendResponse) {
  try {
    const { originalText, result, task, metadata = {} } = payload;
    
    const savedResult = {
      id: Date.now().toString(),
      originalText,
      result,
      task,
      modelId: currentModelId,
      timestamp: Date.now(),
      metadata
    };
    
    await chrome.storage.local.set({
      [`result_${savedResult.id}`]: savedResult
    });
    
    sendResponse({ 
      success: true, 
      savedId: savedResult.id
    });
    
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * 📚 OBTENER RESULTADOS GUARDADOS
 */
async function handleGetSavedResults(payload = {}, sendResponse) {
  try {
    const { limit = 50 } = payload;
    
    const allData = await chrome.storage.local.get(null);
    
    const results = Object.entries(allData)
      .filter(([key]) => key.startsWith('result_'))
      .map(([, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    sendResponse({ 
      success: true, 
      results
    });
    
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * 🎮 VERIFICAR SOPORTE WEBGPU
 */
async function handleCheckWebGPUSupport(sendResponse) {
  const hasWebGPU = await checkWebGPUSupport();
  sendResponse({ 
    hasWebGPU,
    supported: hasWebGPU
  });
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * 🎮 VERIFICAR WEBGPU
 */
async function checkWebGPUSupport() {
  try {
    if (!navigator.gpu) return false;
    
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
    
  } catch (error) {
    return false;
  }
}

/**
 * 📡 NOTIFICAR A TODAS LAS PESTAÑAS
 */
async function notifyAllTabs(messageType, payload) {
  try {
    const tabs = await chrome.tabs.query({});
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: messageType,
        payload
      }).catch(() => {
        // Ignorar errores de content script no disponible
      });
    });
    
  } catch (error) {
    console.error('❌ Error notificando tabs:', error);
  }
}

/**
 * 🏷️ ACTUALIZAR BADGE
 */
async function updateBadge() {
  try {
    const text = modelLoaded ? '●' : '';
    const color = modelLoaded ? '#10b981' : '#ef4444';
    
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    
  } catch (error) {
    console.error('❌ Error actualizando badge:', error);
  }
}

/**
 * 🧹 LIMPIAR STORAGE ANTIGUO
 */
async function cleanupOldStorage() {
  try {
    // Limpiar resultados más antiguos de 30 días
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const allData = await chrome.storage.local.get(null);
    
    const keysToRemove = [];
    
    Object.entries(allData).forEach(([key, value]) => {
      if (key.startsWith('result_') && value.timestamp < thirtyDaysAgo) {
        keysToRemove.push(key);
      }
    });
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`🧹 Limpiados ${keysToRemove.length} resultados antiguos`);
    }
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

/**
 * 📚 CARGAR REGISTRO DE MODELOS
 */
async function loadModelRegistry() {
  try {
    const registryUrl = chrome.runtime.getURL('models/model-registry.json');
    const response = await fetch(registryUrl);
    const registry = await response.json();
    console.log('📚 Registro de modelos cargado');
    modelRegistry = registry;
    return registry;
  } catch (error) {
    console.error('❌ Error cargando registro de modelos:', error);
    return null;
  }
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

console.log('🚀 LocalLoom Service Worker iniciado');
console.log('⏰ Estrategia de persistencia: chrome.alarms + message handlers');
console.log('📍 Manifest V3 compatible - NO usa setInterval ni loops infinitos'); 