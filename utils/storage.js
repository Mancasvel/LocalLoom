/**
 * Utilidades de almacenamiento para LocalLoom
 * Maneja IndexedDB para resultados grandes y localStorage para configuraciones
 */

// Configuración de IndexedDB
const DB_NAME = 'LocalLoomDB';
const DB_VERSION = 1;
const RESULTS_STORE = 'processedResults';
const SETTINGS_STORE = 'userSettings';

// Instancia de base de datos
let db = null;

/**
 * Inicializar IndexedDB
 */
export async function initDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Error abriendo IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB inicializada exitosamente');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Store para resultados procesados
      if (!database.objectStoreNames.contains(RESULTS_STORE)) {
        const resultsStore = database.createObjectStore(RESULTS_STORE, {
          keyPath: 'id'
        });
        
        // Índices para búsquedas eficientes
        resultsStore.createIndex('timestamp', 'timestamp', { unique: false });
        resultsStore.createIndex('task', 'task', { unique: false });
        resultsStore.createIndex('modelId', 'modelId', { unique: false });
        resultsStore.createIndex('url', 'url', { unique: false });
        
        console.log('Store de resultados creado');
      }
      
      // Store para configuraciones
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        const settingsStore = database.createObjectStore(SETTINGS_STORE, {
          keyPath: 'key'
        });
        
        console.log('Store de configuraciones creado');
      }
    };
  });
}

/**
 * Guardar resultado de procesamiento en IndexedDB
 */
export async function saveProcessedResult(resultData) {
  try {
    await initDB();
    
    const result = {
      id: resultData.id || generateId(),
      originalText: resultData.originalText,
      processedText: resultData.result,
      task: resultData.task,
      modelId: resultData.modelId,
      modelName: resultData.modelName,
      timestamp: resultData.timestamp || Date.now(),
      url: resultData.url || 'unknown',
      metadata: resultData.metadata || {},
      // Campos adicionales para análisis
      textLength: resultData.originalText.length,
      resultLength: resultData.result.length,
      processingTime: resultData.processingTime || 0
    };
    
    const transaction = db.transaction([RESULTS_STORE], 'readwrite');
    const store = transaction.objectStore(RESULTS_STORE);
    
    const request = store.put(result);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Resultado guardado en IndexedDB:', result.id);
        resolve(result.id);
      };
      
      request.onerror = () => {
        console.error('Error guardando resultado:', request.error);
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error en saveProcessedResult:', error);
    throw error;
  }
}

/**
 * Obtener resultados guardados con filtros
 */
export async function getProcessedResults(options = {}) {
  try {
    await initDB();
    
    const {
      limit = 50,
      task = null,
      modelId = null,
      startDate = null,
      endDate = null,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;
    
    const transaction = db.transaction([RESULTS_STORE], 'readonly');
    const store = transaction.objectStore(RESULTS_STORE);
    
    // Usar índice si está disponible
    let request;
    if (task) {
      const index = store.index('task');
      request = index.getAll(task);
    } else if (modelId) {
      const index = store.index('modelId');
      request = index.getAll(modelId);
    } else {
      request = store.getAll();
    }
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let results = request.result;
        
        // Filtrar por fecha si se especifica
        if (startDate || endDate) {
          results = results.filter(result => {
            const timestamp = result.timestamp;
            if (startDate && timestamp < startDate) return false;
            if (endDate && timestamp > endDate) return false;
            return true;
          });
        }
        
        // Ordenar resultados
        results.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          
          if (sortOrder === 'desc') {
            return bVal - aVal;
          } else {
            return aVal - bVal;
          }
        });
        
        // Limitar resultados
        if (limit > 0) {
          results = results.slice(0, limit);
        }
        
        resolve(results);
      };
      
      request.onerror = () => {
        console.error('Error obteniendo resultados:', request.error);
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error en getProcessedResults:', error);
    throw error;
  }
}

/**
 * Eliminar resultado por ID
 */
export async function deleteProcessedResult(id) {
  try {
    await initDB();
    
    const transaction = db.transaction([RESULTS_STORE], 'readwrite');
    const store = transaction.objectStore(RESULTS_STORE);
    
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Resultado eliminado:', id);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Error eliminando resultado:', request.error);
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error en deleteProcessedResult:', error);
    throw error;
  }
}

/**
 * Limpiar resultados antiguos (mantener solo los últimos N)
 */
export async function cleanupOldResults(keepCount = 100) {
  try {
    const allResults = await getProcessedResults({ limit: 0 });
    
    if (allResults.length <= keepCount) {
      return { deleted: 0, kept: allResults.length };
    }
    
    // Ordenar por timestamp y eliminar los más antiguos
    const sortedResults = allResults.sort((a, b) => b.timestamp - a.timestamp);
    const toDelete = sortedResults.slice(keepCount);
    
    let deletedCount = 0;
    for (const result of toDelete) {
      await deleteProcessedResult(result.id);
      deletedCount++;
    }
    
    console.log(`Limpieza completada: ${deletedCount} resultados eliminados, ${keepCount} mantenidos`);
    
    return { deleted: deletedCount, kept: keepCount };
    
  } catch (error) {
    console.error('Error en cleanup:', error);
    throw error;
  }
}

/**
 * Guardar configuración en IndexedDB
 */
export async function saveSetting(key, value) {
  try {
    await initDB();
    
    const setting = {
      key,
      value,
      timestamp: Date.now()
    };
    
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    
    const request = store.put(setting);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Configuración guardada:', key);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Error guardando configuración:', request.error);
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error en saveSetting:', error);
    // Fallback a localStorage
    localStorage.setItem(`localloom_${key}`, JSON.stringify(value));
    return true;
  }
}

/**
 * Obtener configuración de IndexedDB
 */
export async function getSetting(key, defaultValue = null) {
  try {
    await initDB();
    
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    
    const request = store.get(key);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      
      request.onerror = () => {
        console.error('Error obteniendo configuración:', request.error);
        // Fallback a localStorage
        const fallback = localStorage.getItem(`localloom_${key}`);
        resolve(fallback ? JSON.parse(fallback) : defaultValue);
      };
    });
    
  } catch (error) {
    console.error('Error en getSetting:', error);
    // Fallback a localStorage
    const fallback = localStorage.getItem(`localloom_${key}`);
    return fallback ? JSON.parse(fallback) : defaultValue;
  }
}

/**
 * Utilidades localStorage para configuraciones simples
 */
export const localSettings = {
  // Preferencias de usuario
  setPreference(key, value) {
    localStorage.setItem(`localloom_pref_${key}`, JSON.stringify(value));
  },
  
  getPreference(key, defaultValue = null) {
    const value = localStorage.getItem(`localloom_pref_${key}`);
    return value ? JSON.parse(value) : defaultValue;
  },
  
  // Configuraciones de modelo
  setModelConfig(modelId, config) {
    localStorage.setItem(`localloom_model_${modelId}`, JSON.stringify(config));
  },
  
  getModelConfig(modelId) {
    const config = localStorage.getItem(`localloom_model_${modelId}`);
    return config ? JSON.parse(config) : null;
  },
  
  // Estadísticas de uso
  incrementUsageCount(task) {
    const key = `localloom_usage_${task}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, (current + 1).toString());
  },
  
  getUsageCount(task) {
    return parseInt(localStorage.getItem(`localloom_usage_${task}`) || '0');
  },
  
  // Limpiar configuraciones
  clearAll() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('localloom_'));
    keys.forEach(key => localStorage.removeItem(key));
  }
};

/**
 * Exportar datos para respaldo
 */
export async function exportData() {
  try {
    const results = await getProcessedResults({ limit: 0 });
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      resultsCount: results.length,
      results: results,
      settings: {}
    };
    
    // Agregar configuraciones de localStorage
    const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('localloom_'));
    localStorageKeys.forEach(key => {
      exportData.settings[key] = localStorage.getItem(key);
    });
    
    return exportData;
    
  } catch (error) {
    console.error('Error exportando datos:', error);
    throw error;
  }
}

/**
 * Importar datos desde respaldo
 */
export async function importData(importData) {
  try {
    if (!importData.version || !importData.results) {
      throw new Error('Formato de importación inválido');
    }
    
    let importedCount = 0;
    
    // Importar resultados
    for (const result of importData.results) {
      await saveProcessedResult(result);
      importedCount++;
    }
    
    // Importar configuraciones
    if (importData.settings) {
      Object.entries(importData.settings).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    }
    
    console.log(`Importación completada: ${importedCount} resultados importados`);
    
    return { imported: importedCount };
    
  } catch (error) {
    console.error('Error importando datos:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de uso
 */
export async function getUsageStats() {
  try {
    const results = await getProcessedResults({ limit: 0 });
    
    const stats = {
      totalResults: results.length,
      taskCounts: {},
      modelCounts: {},
      dailyUsage: {},
      averageTextLength: 0,
      totalProcessingTime: 0
    };
    
    let totalTextLength = 0;
    let totalProcessingTime = 0;
    
    results.forEach(result => {
      // Conteos por tarea
      stats.taskCounts[result.task] = (stats.taskCounts[result.task] || 0) + 1;
      
      // Conteos por modelo
      stats.modelCounts[result.modelId] = (stats.modelCounts[result.modelId] || 0) + 1;
      
      // Uso diario
      const date = new Date(result.timestamp).toDateString();
      stats.dailyUsage[date] = (stats.dailyUsage[date] || 0) + 1;
      
      // Promedios
      totalTextLength += result.textLength || 0;
      totalProcessingTime += result.processingTime || 0;
    });
    
    if (results.length > 0) {
      stats.averageTextLength = Math.round(totalTextLength / results.length);
      stats.totalProcessingTime = totalProcessingTime;
    }
    
    return stats;
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * Generar ID único
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Inicializar automáticamente al cargar
initDB().catch(error => {
  console.error('Error inicializando base de datos:', error);
}); 