<script>
  import { onMount } from 'svelte';
  import { llmStore, selectedTextStore, responseStore } from '../stores/stores.js';
  import { sendMessage } from '../utils/messaging.js';
  
  let selectedText = '';
  let llmResponse = '';
  let processing = false;
  let modelLoaded = false;
  
  // Task options
  let selectedTask = 'summarize';
  const tasks = {
    summarize: 'Resumir texto',
    rewrite: 'Reescribir',
    counter: 'Contrargumento',
    question: 'Pregunta reflexiva'
  };
  
  onMount(async () => {
    // Subscribe to stores
    selectedTextStore.subscribe(value => {
      selectedText = value;
    });
    
    responseStore.subscribe(value => {
      llmResponse = value;
    });
    
    llmStore.subscribe(value => {
      modelLoaded = value.loaded;
    });
    
    // Get current selected text from content script
    try {
      const response = await sendMessage({ type: 'GET_SELECTED_TEXT' });
      if (response.text) {
        selectedTextStore.set(response.text);
      }
    } catch (error) {
      console.error('Error getting selected text:', error);
    }
  });
  
  async function processText() {
    if (!selectedText.trim()) {
      alert('No hay texto seleccionado');
      return;
    }
    
    processing = true;
    try {
      const response = await sendMessage({
        type: 'PROCESS_TEXT',
        payload: {
          text: selectedText,
          task: selectedTask
        }
      });
      
      if (response.success) {
        responseStore.set(response.result);
      } else {
        alert('Error procesando texto: ' + response.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error comunicándose con el background script');
    } finally {
      processing = false;
    }
  }
  
  async function loadModel() {
    try {
      await sendMessage({ type: 'LOAD_MODEL' });
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }
  
  function saveResult() {
    if (llmResponse.trim()) {
      sendMessage({
        type: 'SAVE_RESULT',
        payload: {
          originalText: selectedText,
          task: selectedTask,
          result: llmResponse,
          timestamp: Date.now()
        }
      });
      alert('Resultado guardado');
    }
  }
</script>

<main>
  <div class="header">
    <h1>🧠 LocalLoom</h1>
    <div class="status">
      <span class="status-indicator {modelLoaded ? 'loaded' : 'not-loaded'}"></span>
      {modelLoaded ? 'Modelo cargado' : 'Modelo no cargado'}
    </div>
  </div>
  
  {#if !modelLoaded}
    <div class="section">
      <button on:click={loadModel} class="primary-btn">
        Cargar Modelo Local
      </button>
    </div>
  {/if}
  
  <div class="section">
    <label for="selected-text">Texto seleccionado:</label>
    <textarea 
      id="selected-text"
      bind:value={selectedText} 
      placeholder="Selecciona texto en la página o escribe aquí..."
      rows="4"
    ></textarea>
  </div>
  
  <div class="section">
    <label for="task-select">Tarea:</label>
    <select id="task-select" bind:value={selectedTask}>
      {#each Object.entries(tasks) as [key, label]}
        <option value={key}>{label}</option>
      {/each}
    </select>
  </div>
  
  <div class="section">
    <button 
      on:click={processText} 
      disabled={processing || !modelLoaded || !selectedText.trim()}
      class="primary-btn"
    >
      {processing ? 'Procesando...' : 'Procesar Texto'}
    </button>
  </div>
  
  {#if llmResponse}
    <div class="section">
      <label for="result-area">Resultado:</label>
      <div id="result-area" class="response">
        {llmResponse}
      </div>
      <button on:click={saveResult} class="secondary-btn">
        💾 Guardar Resultado
      </button>
    </div>
  {/if}
</main>

<style>
  main {
    width: 400px;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  h1 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .status {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #666;
  }
  
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 5px;
  }
  
  .status-indicator.loaded {
    background-color: #22c55e;
  }
  
  .status-indicator.not-loaded {
    background-color: #ef4444;
  }
  
  .section {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #374151;
  }
  
  textarea, select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .primary-btn {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.2s;
  }
  
  .primary-btn:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  .primary-btn:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
  
  .secondary-btn {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    margin-top: 8px;
  }
  
  .secondary-btn:hover {
    background-color: #e5e7eb;
  }
  
  .response {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.5;
    max-height: 200px;
    overflow-y: auto;
  }
</style> 