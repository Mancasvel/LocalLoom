import { writable, derived, get } from 'svelte/store';

// Store para el estado del modelo LLM
export const modelStore = writable({
  isLoaded: false,
  isLoading: false,
  modelId: null,
  modelName: null,
  hasWebGPU: false,
  loadingProgress: 0,
  loadingMessage: '',
  error: null,
  lastLoadTime: null
});

// Store para el texto seleccionado y su contexto
export const selectedTextStore = writable('');

// Store para el texto original (para comparación)
export const originalTextStore = writable('');

// Store para la respuesta del LLM
export const responseStore = writable('');

// Store para el estado de carga/procesamiento
export const loadingStore = writable(false);

// Store para el progreso de procesamiento
export const progressStore = writable({
  isProcessing: false,
  progress: 0,
  message: '',
  startTime: null
});

// Store para la tarea actual seleccionada
export const currentTaskStore = writable('summarize');

// Store para configuraciones avanzadas del modelo
export const modelConfigStore = writable({
  maxTokens: 256,
  temperature: 0.7,
  topP: 0.9,
  repetitionPenalty: 1.1,
  useWebGPU: true,
  contextLength: 2048
});

// Store para configuraciones de usuario
export const settingsStore = writable({
  defaultTask: 'summarize',
  autoSave: true,
  showAdvancedSettings: false,
  theme: 'light',
  language: 'es',
  notifications: true,
  maxHistoryItems: 100,
  autoCleanup: true
});

// Store para el historial de resultados
export const historyStore = writable([]);

// Store para estadísticas de uso
export const statsStore = writable({
  totalProcessed: 0,
  taskCounts: {
    summarize: 0,
    rewrite: 0,
    counter_argument: 0,
    question: 0
  },
  sessionStats: {
    startTime: Date.now(),
    processedCount: 0,
    errors: 0,
    averageProcessingTime: 0
  },
  dailyUsage: {},
  weeklyUsage: {},
  modelUsage: {}
});

// Store para el estado de la UI
export const uiStore = writable({
  activeTab: 'process',
  showHistory: false,
  showSettings: false,
  showStats: false,
  sidebarCollapsed: false,
  notifications: [],
  currentView: 'main'
});

// Store para errores y notificaciones
export const notificationsStore = writable([]);

// Store para el estado de WebGPU
export const webGPUStore = writable({
  supported: false,
  available: false,
  adapter: null,
  device: null,
  features: [],
  limits: {},
  error: null
});

// Store para el contexto de la página actual
export const pageContextStore = writable({
  url: '',
  title: '',
  selectedText: '',
  selectionPosition: null,
  domain: '',
  language: 'es'
});

// Store derivado para el estado general de la aplicación
export const appStateStore = derived(
  [modelStore, loadingStore, progressStore, settingsStore],
  ([$model, $loading, $progress, $settings]) => ({
    isReady: $model.isLoaded && !$loading,
    isIdle: !$model.isLoading && !$loading && !$progress.isProcessing,
    canProcess: $model.isLoaded && !$loading && !$progress.isProcessing,
    needsModelLoad: !$model.isLoaded && !$model.isLoading,
    hasError: !!$model.error,
    currentStatus: $model.isLoading ? 'loading' : 
                   $loading ? 'processing' : 
                   $model.isLoaded ? 'ready' : 'idle'
  })
);

// Store derivado para estadísticas agregadas
export const aggregatedStatsStore = derived(
  [statsStore, historyStore],
  ([$stats, $history]) => {
    const totalResults = $history.length;
    const today = new Date().toDateString();
    const todayResults = $history.filter(result => 
      new Date(result.timestamp).toDateString() === today
    ).length;
    
    const avgTextLength = totalResults > 0 ? 
      $history.reduce((sum, result) => sum + (result.textLength || 0), 0) / totalResults : 0;
    
    const mostUsedTask = Object.entries($stats.taskCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b, ['summarize', 0])[0];
    
    return {
      totalResults,
      todayResults,
      avgTextLength: Math.round(avgTextLength),
      mostUsedTask,
      totalProcessingTime: $stats.sessionStats.averageProcessingTime * totalResults,
      errorRate: totalResults > 0 ? ($stats.sessionStats.errors / totalResults) * 100 : 0
    };
  }
);

// Funciones helper para manejar stores

/**
 * Actualizar estado del modelo
 */
export function updateModelState(updates) {
  modelStore.update(state => ({
    ...state,
    ...updates,
    lastLoadTime: updates.isLoaded ? Date.now() : state.lastLoadTime
  }));
}

/**
 * Mostrar notificación
 */
export function showNotification(message, type = 'info', duration = 3000) {
  const notification = {
    id: Date.now().toString(),
    message,
    type, // 'info', 'success', 'warning', 'error'
    timestamp: Date.now(),
    duration
  };
  
  notificationsStore.update(notifications => [
    ...notifications,
    notification
  ]);
  
  // Auto remove notification
  if (duration > 0) {
    setTimeout(() => {
      notificationsStore.update(notifications => 
        notifications.filter(n => n.id !== notification.id)
      );
    }, duration);
  }
  
  return notification.id;
}

/**
 * Limpiar notificación
 */
export function clearNotification(id) {
  notificationsStore.update(notifications => 
    notifications.filter(n => n.id !== id)
  );
}

/**
 * Incrementar estadísticas de uso
 */
export function incrementTaskUsage(task) {
  statsStore.update(stats => ({
    ...stats,
    totalProcessed: stats.totalProcessed + 1,
    taskCounts: {
      ...stats.taskCounts,
      [task]: (stats.taskCounts[task] || 0) + 1
    },
    sessionStats: {
      ...stats.sessionStats,
      processedCount: stats.sessionStats.processedCount + 1
    }
  }));
}

/**
 * Actualizar tiempo de procesamiento
 */
export function updateProcessingTime(duration) {
  statsStore.update(stats => {
    const currentAvg = stats.sessionStats.averageProcessingTime;
    const count = stats.sessionStats.processedCount;
    const newAvg = count > 0 ? ((currentAvg * (count - 1)) + duration) / count : duration;
    
    return {
      ...stats,
      sessionStats: {
        ...stats.sessionStats,
        averageProcessingTime: newAvg
      }
    };
  });
}

/**
 * Agregar resultado al historial
 */
export function addToHistory(result) {
  historyStore.update(history => {
    const newHistory = [result, ...history];
    
    // Limitar el historial según configuración
    const maxItems = get(settingsStore).maxHistoryItems || 100;
    return newHistory.slice(0, maxItems);
  });
}

/**
 * Limpiar historial
 */
export function clearHistory() {
  historyStore.set([]);
}

/**
 * Actualizar progreso
 */
export function updateProgress(progress, message = '') {
  progressStore.update(state => ({
    ...state,
    progress,
    message,
    isProcessing: progress < 100 && progress > 0
  }));
}

/**
 * Iniciar procesamiento
 */
export function startProcessing(message = 'Procesando...') {
  progressStore.set({
    isProcessing: true,
    progress: 0,
    message,
    startTime: Date.now()
  });
  loadingStore.set(true);
}

/**
 * Finalizar procesamiento
 */
export function finishProcessing(success = true) {
  const startTime = get(progressStore).startTime;
  const duration = startTime ? Date.now() - startTime : 0;
  
  progressStore.set({
    isProcessing: false,
    progress: 100,
    message: success ? 'Completado' : 'Error',
    startTime: null
  });
  
  loadingStore.set(false);
  
  if (duration > 0) {
    updateProcessingTime(duration);
  }
  
  if (!success) {
    statsStore.update(stats => ({
      ...stats,
      sessionStats: {
        ...stats.sessionStats,
        errors: stats.sessionStats.errors + 1
      }
    }));
  }
}

/**
 * Resetear estado de la aplicación
 */
export function resetAppState() {
  selectedTextStore.set('');
  originalTextStore.set('');
  responseStore.set('');
  loadingStore.set(false);
  progressStore.set({
    isProcessing: false,
    progress: 0,
    message: '',
    startTime: null
  });
  notificationsStore.set([]);
}

/**
 * Cargar configuraciones desde localStorage
 */
export function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('localloom_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      settingsStore.update(current => ({ ...current, ...parsed }));
    }
  } catch (error) {
    console.error('Error cargando configuraciones:', error);
  }
}

/**
 * Guardar configuraciones en localStorage
 */
export function saveSettings() {
  try {
    const settings = get(settingsStore);
    localStorage.setItem('localloom_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error guardando configuraciones:', error);
  }
}

/**
 * Suscripción para auto-guardar configuraciones
 */
settingsStore.subscribe(saveSettings);

// Cargar configuraciones al inicializar
loadSettings();

console.log('LocalLoom stores inicializados'); 