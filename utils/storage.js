// ===== LocalStorage Helpers =====

/**
 * Guarda configuraciones simples en localStorage
 * @param {string} key - Clave
 * @param {any} value - Valor a guardar
 */
export function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Obtiene configuraciones de localStorage
 * @param {string} key - Clave
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} - Valor guardado o valor por defecto
 */
export function getFromLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Elimina un elemento de localStorage
 * @param {string} key - Clave a eliminar
 */
export function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

// ===== IndexedDB Helpers =====

const DB_NAME = 'LocalLoomDB';
const DB_VERSION = 1;
const STORES = {
  RESULTS: 'results',
  HISTORY: 'history',
  MODELS: 'models'
};

/**
 * Inicializa la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>} - Base de datos inicializada
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store para resultados de procesamiento
      if (!db.objectStoreNames.contains(STORES.RESULTS)) {
        const resultsStore = db.createObjectStore(STORES.RESULTS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        resultsStore.createIndex('timestamp', 'timestamp', { unique: false });
        resultsStore.createIndex('task', 'task', { unique: false });
      }
      
      // Store para historial de texto procesado
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        const historyStore = db.createObjectStore(STORES.HISTORY, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        historyStore.createIndex('url', 'url', { unique: false });
      }
      
      // Store para metadatos de modelos (no los modelos en sí)
      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        const modelsStore = db.createObjectStore(STORES.MODELS, { 
          keyPath: 'name' 
        });
        modelsStore.createIndex('lastUsed', 'lastUsed', { unique: false });
      }
    };
  });
}

/**
 * Guarda un resultado en IndexedDB
 * @param {Object} resultData - Datos del resultado
 * @returns {Promise<number>} - ID del resultado guardado
 */
export async function saveResult(resultData) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RESULTS], 'readwrite');
    const store = transaction.objectStore(STORES.RESULTS);
    
    const data = {
      ...resultData,
      timestamp: Date.now(),
      id: undefined // Se generará automáticamente
    };
    
    const request = store.add(data);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene todos los resultados
 * @param {number} limit - Límite de resultados (opcional)
 * @returns {Promise<Array>} - Array de resultados
 */
export async function getResults(limit = null) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RESULTS], 'readonly');
    const store = transaction.objectStore(STORES.RESULTS);
    const index = store.index('timestamp');
    
    const request = index.openCursor(null, 'prev'); // Ordenar por timestamp descendente
    const results = [];
    let count = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      
      if (cursor && (!limit || count < limit)) {
        results.push(cursor.value);
        count++;
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Busca resultados por tarea
 * @param {string} task - Tipo de tarea
 * @returns {Promise<Array>} - Array de resultados filtrados
 */
export async function getResultsByTask(task) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RESULTS], 'readonly');
    const store = transaction.objectStore(STORES.RESULTS);
    const index = store.index('task');
    
    const request = index.getAll(task);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Elimina un resultado por ID
 * @param {number} id - ID del resultado
 * @returns {Promise<void>}
 */
export async function deleteResult(id) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RESULTS], 'readwrite');
    const store = transaction.objectStore(STORES.RESULTS);
    
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Limpia resultados antiguos (mantiene solo los últimos N)
 * @param {number} keepCount - Número de resultados a mantener
 * @returns {Promise<void>}
 */
export async function cleanOldResults(keepCount = 100) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RESULTS], 'readwrite');
    const store = transaction.objectStore(STORES.RESULTS);
    const index = store.index('timestamp');
    
    const request = index.openCursor(null, 'prev');
    let count = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      
      if (cursor) {
        count++;
        if (count > keepCount) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// ===== Chrome Storage Helpers =====

/**
 * Guarda datos usando Chrome Storage API
 * @param {Object} data - Datos a guardar
 * @returns {Promise<void>}
 */
export function saveToChromeStorage(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Obtiene datos de Chrome Storage API
 * @param {string|Array} keys - Clave(s) a obtener
 * @returns {Promise<Object>} - Datos obtenidos
 */
export function getFromChromeStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
} 