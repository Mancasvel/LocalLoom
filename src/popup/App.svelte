<script>
  import { onMount, onDestroy } from 'svelte';
  import { modelStore, selectedTextStore, responseStore, loadingStore } from '../stores/stores.js';
  import { sendMessage } from '../utils/messaging.js';
  import { writable } from 'svelte/store';
  
  // Estados reactivos
  let selectedText = '';
  let processedResult = '';
  let processing = false;
  let modelStatus = {
    isLoaded: false,
    isLoading: false,
    modelId: null,
    modelName: null,
    hasWebGPU: null
  };
  let loadingProgress = 0;
  let loadingMessage = '';
  let savedResults = [];
  let showHistory = false;
  let webGPUSupport = false;
  
  // Configuración de tareas
  let selectedTask = 'summarize';
  const tasks = {
    summarize: { label: 'Resumir', icon: '📝', color: '#3b82f6' },
    rewrite: { label: 'Reescribir', icon: '✏️', color: '#10b981' },
    counter_argument: { label: 'Contrargumento', icon: '🤔', color: '#f59e0b' },
    question: { label: 'Pregunta reflexiva', icon: '❓', color: '#8b5cf6' }
  };
  
  // Configuración avanzada
  let showAdvancedSettings = false;
  let advancedConfig = {
    maxTokens: 256,
    temperature: 0.7,
    topP: 0.9,
    repetitionPenalty: 1.1
  };
  
  onMount(async () => {
    console.log('🚀 LocalLoom popup iniciado');
    
    // Suscribirse a stores
    selectedTextStore.subscribe(value => {
      selectedText = value;
    });
    
    responseStore.subscribe(value => {
      processedResult = value;
    });
    
    loadingStore.subscribe(value => {
      processing = value;
    });
    
    // Verificar estado inicial
    await checkInitialState();
    
    // Configurar listeners para mensajes del background
    setupMessageListeners();
  });
  
  async function checkInitialState() {
    try {
      // Verificar soporte WebGPU manualmente
      await checkWebGPUManually();
      
      // Verificar soporte WebGPU desde background
      const webGPUCheck = await sendMessage({ type: 'CHECK_WEBGPU_SUPPORT' });
      webGPUSupport = webGPUCheck.hasWebGPU;
      
      // Obtener estado del modelo
      const status = await sendMessage({ type: 'GET_MODEL_STATUS' });
      modelStatus = status;
      
      // Obtener texto seleccionado actual si existe
      const selectedTextData = await chrome.storage.session.get(['lastSelectedText']);
      if (selectedTextData.lastSelectedText) {
        selectedTextStore.set(selectedTextData.lastSelectedText.text);
      }
      
      // Cargar historial reciente
      await loadRecentHistory();
      
    } catch (error) {
      console.error('Error verificando estado inicial:', error);
    }
  }
  
  async function checkWebGPUManually() {
    try {
      console.log('Verificando WebGPU manualmente...');
      
      // Verificar si navigator.gpu existe
      if (!navigator.gpu) {
        console.log('❌ navigator.gpu no existe');
        webGPUSupport = false;
        return;
      }
      
      console.log('✅ navigator.gpu existe');
      
      // Intentar obtener adapter
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log('❌ No se pudo obtener WebGPU adapter');
        webGPUSupport = false;
        return;
      }
      
      console.log('✅ WebGPU adapter obtenido:', adapter);
      webGPUSupport = true;
      
      // Log información del adapter
      console.log('WebGPU adapter info:', {
        features: Array.from(adapter.features || []),
        limits: adapter.limits
      });
      
    } catch (error) {
      console.log('❌ Error verificando WebGPU:', error);
      webGPUSupport = false;
    }
  }
  
  function setupMessageListeners() {
    // Escuchar mensajes del background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'MODEL_LOADING_STARTED':
          modelStatus.isLoading = true;
          loadingMessage = `Cargando ${message.payload.modelName}...`;
          break;
          
        case 'MODEL_LOADING_PROGRESS':
          loadingProgress = message.payload.progress;
          loadingMessage = message.payload.text;
          break;
          
        case 'MODEL_LOADED':
          modelStatus = {
            isLoaded: true,
            isLoading: false,
            modelId: message.payload.modelId,
            modelName: message.payload.modelName,
            hasWebGPU: webGPUSupport
          };
          loadingMessage = 'Modelo cargado exitosamente';
          break;
          
        case 'MODEL_LOADING_ERROR':
          modelStatus.isLoading = false;
          loadingMessage = `Error: ${message.payload.error}`;
          break;
          
        case 'MODEL_UNLOADED':
          modelStatus = {
            isLoaded: false,
            isLoading: false,
            modelId: null,
            modelName: null,
            hasWebGPU: webGPUSupport
          };
          break;
      }
    });
  }
  
  async function loadModel() {
    try {
      loadingStore.set(true);
      modelStatus.isLoading = true;
      loadingMessage = 'Iniciando carga del modelo...';
      
      const response = await sendMessage({ 
        type: 'LOAD_MODEL',
        payload: { modelId: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC' }
      }, 120000); // 2 minutos timeout para carga del modelo
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Error cargando modelo:', error);
      
      if (error.message.includes('Timeout')) {
        alert(`La carga del modelo está tardando más de lo esperado. Esto es normal en la primera carga (~600MB). 
        
Por favor:
1. Mantén la pestaña abierta
2. Asegúrate de tener buena conexión a internet
3. El modelo se está descargando en segundo plano
4. Intenta de nuevo en unos minutos`);
      } else {
        alert(`Error cargando modelo: ${error.message}`);
      }
    } finally {
      loadingStore.set(false);
    }
  }
  
  async function unloadModel() {
    try {
      const response = await sendMessage({ type: 'UNLOAD_MODEL' });
      if (response.success) {
        processedResult = '';
        responseStore.set('');
      }
    } catch (error) {
      console.error('Error descargando modelo:', error);
    }
  }
  
  async function processText() {
    if (!selectedText.trim()) {
      alert('No hay texto para procesar');
      return;
    }
    
    if (!modelStatus.isLoaded) {
      alert('El modelo no está cargado. Carga el modelo primero.');
      return;
    }
    
    try {
      processing = true;
      loadingStore.set(true);
      
      const startTime = Date.now();
      
      const response = await sendMessage({
        type: 'PROCESS_TEXT',
        payload: {
          text: selectedText,
          task: selectedTask,
          options: advancedConfig
        }
      });
      
      const processingTime = Date.now() - startTime;
      
      if (response.success) {
        responseStore.set(response.result);
        
        // Actualizar estadísticas de uso
        const usageKey = `localloom_usage_${selectedTask}`;
        const currentUsage = parseInt(localStorage.getItem(usageKey) || '0');
        localStorage.setItem(usageKey, (currentUsage + 1).toString());
        
        console.log(`Texto procesado en ${processingTime}ms`);
      } else {
        if (response.needsModelLoad) {
          alert('El modelo no está cargado. Cargando automáticamente...');
          await loadModel();
        } else {
          throw new Error(response.error);
        }
      }
      
    } catch (error) {
      console.error('Error procesando texto:', error);
      alert(`Error procesando texto: ${error.message}`);
    } finally {
      processing = false;
      loadingStore.set(false);
    }
  }
  
  async function saveResult() {
    if (!processedResult.trim()) {
      alert('No hay resultado para guardar');
      return;
    }
    
    try {
      const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabUrl = currentTab[0]?.url || 'unknown';
      
      const response = await sendMessage({
        type: 'SAVE_RESULT',
        payload: {
          originalText: selectedText,
          result: processedResult,
          task: selectedTask,
          metadata: {
            url: tabUrl,
            timestamp: Date.now(),
            modelId: modelStatus.modelId,
            modelName: modelStatus.modelName,
            config: advancedConfig
          }
        }
      });
      
      if (response.success) {
        alert('✅ Resultado guardado exitosamente');
        await loadRecentHistory(); // Actualizar historial
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Error guardando resultado:', error);
      alert(`Error guardando resultado: ${error.message}`);
    }
  }
  
  async function loadRecentHistory() {
    try {
      const response = await sendMessage({
        type: 'GET_SAVED_RESULTS',
        payload: { limit: 10 }
      });
      
      if (response.success) {
        savedResults = response.results;
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  }
  
  function loadResultToEditor(result) {
    selectedTextStore.set(result.originalText);
    responseStore.set(result.result);
    selectedTask = result.task;
    showHistory = false;
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = '✅ Copiado';
      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    });
  }
  
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function getUsageStats() {
    const stats = {};
    Object.keys(tasks).forEach(task => {
      stats[task] = parseInt(localStorage.getItem(`localloom_usage_${task}`) || '0');
    });
    return stats;
  }
  
  onDestroy(() => {
    console.log('🔄 Popup cerrado');
  });
</script>

<main class="app">
  <header class="app-header">
    <div class="header-top">
      <h1>🧠 LocalLoom</h1>
      <div class="model-status">
        <div class="status-indicator {modelStatus.isLoaded ? 'loaded' : modelStatus.isLoading ? 'loading' : 'not-loaded'}"></div>
        <span class="status-text">
          {#if modelStatus.isLoaded}
            {modelStatus.modelName || 'Modelo cargado'}
          {:else if modelStatus.isLoading}
            Cargando...
          {:else}
            No cargado
          {/if}
        </span>
      </div>
    </div>
    
    {#if !webGPUSupport}
      <div class="warning">
        ⚠️ WebGPU no detectado automáticamente. 
        <details>
          <summary>Ver soluciones</summary>
          <div class="webgpu-help">
            <p><strong>Pasos para activar WebGPU:</strong></p>
            <ol>
              <li>Ve a <code>chrome://flags/#enable-unsafe-webgpu</code></li>
              <li>Cambia a "Enabled"</li>
              <li>Reinicia Chrome completamente</li>
              <li>Recarga esta extensión</li>
            </ol>
            <p><strong>Verificación manual:</strong></p>
            <ul>
              <li>Versión Chrome: {navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Desconocida'}</li>
              <li>GPU API disponible: {navigator.gpu ? '✅ Sí' : '❌ No'}</li>
            </ul>
            <p><small>ℹ️ Sin WebGPU, el modelo funcionará más lento pero sigue siendo 100% local.</small></p>
            <button class="btn btn-small webgpu-recheck" on:click={checkWebGPUManually}>
              🔄 Re-verificar WebGPU
            </button>
          </div>
        </details>
      </div>
    {/if}
    
    {#if modelStatus.isLoading}
      <div class="loading-bar">
        <div class="progress" style="width: {loadingProgress}%"></div>
      </div>
      <div class="loading-message">{loadingMessage}</div>
    {/if}
  </header>

  <div class="app-content">
    <!-- Sección de control del modelo -->
    {#if !modelStatus.isLoaded && !modelStatus.isLoading}
      <section class="section model-section">
        <div class="section-header">
          <h2>🚀 Comenzar</h2>
        </div>
        <p class="model-info">
          LocalLoom ejecuta modelos de IA completamente en tu navegador. 
          Ningún dato se envía a servidores externos.
        </p>
        <button on:click={loadModel} class="btn btn-primary btn-large">
          Cargar Modelo Local (~600MB)
        </button>
        <div class="model-details">
          <small>
            Modelo: TinyLlama 1.1B Chat<br>
            Aceleración: {webGPUSupport ? 'WebGPU' : 'WASM (fallback)'}
          </small>
        </div>
      </section>
    {/if}

    {#if modelStatus.isLoaded}
      <!-- Sección de texto de entrada -->
      <section class="section">
        <div class="section-header">
          <h2>📝 Texto a procesar</h2>
          <button 
            class="btn btn-small" 
            on:click={() => showHistory = !showHistory}
          >
            {showHistory ? 'Ocultar' : 'Historial'}
          </button>
        </div>
        
        <textarea 
          bind:value={selectedText}
          placeholder="Selecciona texto en la página o escribe aquí..."
          class="text-input"
          rows="4"
        ></textarea>
        
        <div class="input-info">
          {selectedText.length} caracteres
        </div>
      </section>

      <!-- Sección de configuración -->
      <section class="section">
        <div class="section-header">
          <h2>⚙️ Configuración</h2>
          <button 
            class="btn btn-small" 
            on:click={() => showAdvancedSettings = !showAdvancedSettings}
          >
            {showAdvancedSettings ? 'Básico' : 'Avanzado'}
          </button>
        </div>
        
        <div class="task-selector">
          {#each Object.entries(tasks) as [key, task]}
            <button 
              class="task-btn {selectedTask === key ? 'active' : ''}"
              style="--task-color: {task.color}"
              on:click={() => selectedTask = key}
            >
              <span class="task-icon">{task.icon}</span>
              <span class="task-label">{task.label}</span>
            </button>
          {/each}
        </div>
        
        {#if showAdvancedSettings}
          <div class="advanced-settings">
            <div class="setting">
              <label>Tokens máximos: {advancedConfig.maxTokens}</label>
              <input 
                type="range" 
                min="50" 
                max="512" 
                bind:value={advancedConfig.maxTokens}
              />
            </div>
            <div class="setting">
              <label>Temperatura: {advancedConfig.temperature}</label>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                bind:value={advancedConfig.temperature}
              />
            </div>
            <div class="setting">
              <label>Top P: {advancedConfig.topP}</label>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                bind:value={advancedConfig.topP}
              />
            </div>
          </div>
        {/if}
      </section>

      <!-- Botón de procesamiento -->
      <section class="section">
        <button 
          on:click={processText} 
          disabled={processing || !selectedText.trim()}
          class="btn btn-primary btn-large process-btn"
        >
          {#if processing}
            <span class="spinner"></span>
            Procesando...
          {:else}
            {tasks[selectedTask].icon} {tasks[selectedTask].label}
          {/if}
        </button>
      </section>

      <!-- Resultado -->
      {#if processedResult}
        <section class="section result-section">
          <div class="section-header">
            <h2>✨ Resultado</h2>
            <div class="result-actions">
              <button 
                class="btn btn-small" 
                on:click={() => copyToClipboard(processedResult)}
              >
                📋 Copiar
              </button>
              <button class="btn btn-small btn-success" on:click={saveResult}>
                💾 Guardar
              </button>
            </div>
          </div>
          
          <div class="result-content">
            {processedResult}
          </div>
        </section>
      {/if}

      <!-- Historial -->
      {#if showHistory}
        <section class="section history-section">
          <div class="section-header">
            <h2>📚 Historial reciente</h2>
            <button class="btn btn-small" on:click={loadRecentHistory}>
              🔄 Actualizar
            </button>
          </div>
          
          {#if savedResults.length === 0}
            <p class="empty-state">No hay resultados guardados</p>
          {:else}
            <div class="history-list">
              {#each savedResults as result}
                <div class="history-item">
                  <div class="history-header">
                    <span class="history-task">
                      {tasks[result.task]?.icon || '📝'} {tasks[result.task]?.label || result.task}
                    </span>
                    <span class="history-time">{formatTimestamp(result.timestamp)}</span>
                  </div>
                  <div class="history-text">
                    {result.originalText.substring(0, 100)}
                    {result.originalText.length > 100 ? '...' : ''}
                  </div>
                  <div class="history-actions">
                    <button 
                      class="btn btn-tiny" 
                      on:click={() => loadResultToEditor(result)}
                    >
                      Cargar
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      <!-- Controles del modelo -->
      <section class="section model-controls">
        <button class="btn btn-danger btn-small" on:click={unloadModel}>
          🗑️ Descargar modelo
        </button>
      </section>
    {/if}
  </div>
</main>

<style>
  .app {
    width: 420px;
    max-height: 600px;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1f2937;
    background: #f9fafb;
  }

  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .model-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-indicator.loaded {
    background: #10b981;
    animation: none;
  }

  .status-indicator.loading {
    background: #f59e0b;
  }

  .status-indicator.not-loaded {
    background: #ef4444;
    animation: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .warning {
    background: rgba(245, 158, 11, 0.2);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 6px;
    padding: 8px;
    font-size: 12px;
    margin-top: 8px;
  }

  .warning details {
    margin-top: 8px;
  }

  .warning summary {
    cursor: pointer;
    font-weight: 500;
    color: #d97706;
  }

  .warning summary:hover {
    text-decoration: underline;
  }

  .webgpu-help {
    margin-top: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
  }

  .webgpu-help p {
    margin: 4px 0;
  }

  .webgpu-help ol, .webgpu-help ul {
    margin: 4px 0 8px 16px;
    font-size: 11px;
  }

  .webgpu-help li {
    margin: 2px 0;
  }

  .webgpu-help code {
    background: #f3f4f6;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 10px;
  }

  .webgpu-recheck {
    margin-top: 8px;
    background: #f59e0b;
    color: white;
  }

  .webgpu-recheck:hover {
    background: #d97706;
  }

  .loading-bar {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    height: 4px;
    margin-top: 8px;
    overflow: hidden;
  }

  .progress {
    background: white;
    height: 100%;
    border-radius: 10px;
    transition: width 0.3s ease;
  }

  .loading-message {
    font-size: 12px;
    margin-top: 4px;
    opacity: 0.9;
  }

  .app-content {
    padding: 0 20px 20px;
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .section-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  .model-section {
    text-align: center;
  }

  .model-info {
    color: #6b7280;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .model-details {
    margin-top: 12px;
    color: #6b7280;
  }

  .text-input {
    width: 100%;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    transition: border-color 0.2s;
  }

  .text-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .input-info {
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
    text-align: right;
  }

  .task-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .task-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
  }

  .task-btn:hover {
    border-color: var(--task-color);
    background: color-mix(in srgb, var(--task-color) 5%, white);
  }

  .task-btn.active {
    border-color: var(--task-color);
    background: var(--task-color);
    color: white;
  }

  .task-icon {
    font-size: 18px;
  }

  .advanced-settings {
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
  }

  .setting {
    margin-bottom: 8px;
  }

  .setting label {
    display: block;
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .setting input[type="range"] {
    width: 100%;
  }

  .btn {
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-tiny {
    padding: 4px 8px;
    font-size: 11px;
  }

  .btn-large {
    padding: 12px 24px;
    font-size: 14px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .btn-success {
    background: #10b981;
    color: white;
  }

  .btn-success:hover {
    background: #059669;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  .process-btn {
    width: 100%;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .result-section {
    border-left: 4px solid #10b981;
  }

  .result-actions {
    display: flex;
    gap: 8px;
  }

  .result-content {
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    font-size: 14px;
  }

  .history-section {
    max-height: 300px;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    background: #f9fafb;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .history-task {
    font-size: 12px;
    font-weight: 500;
  }

  .history-time {
    font-size: 11px;
    color: #6b7280;
  }

  .history-text {
    font-size: 12px;
    color: #4b5563;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .history-actions {
    text-align: right;
  }

  .model-controls {
    text-align: center;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
  }
</style> 