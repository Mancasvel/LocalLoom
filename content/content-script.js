// Content Script para LocalLoom
// Maneja interacción con páginas web, selección de texto y comunicación con background

class LocalLoomContentScript {
  constructor() {
    this.lastSelectedText = '';
    this.quickActionButton = null;
    this.currentTooltip = null;
    this.selectionData = null;
    this.modelStatus = { isLoaded: false };
    this.processingIndicator = null;
    this.loadingIndicator = null;
    
    this.init();
  }
  
  init() {
    console.log('LocalLoom content script iniciado');
    
    // Configurar listeners de eventos
    this.setupEventListeners();
    
    // Configurar listener de mensajes
    this.setupMessageListener();
    
    // Verificar estado inicial del modelo
    this.checkModelStatus();
    
    // Inyectar estilos CSS
    this.injectStyles();
  }
  
  setupEventListeners() {
    // Listener para selección de texto
    document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
    document.addEventListener('keyup', (e) => this.handleTextSelection(e));
    
    // Listener para clicks fuera de elementos de LocalLoom
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.localloom-element')) {
        this.hideQuickActionButton();
        this.removeTooltips();
      }
    });
    
    // Listener para scroll (ocultar elementos flotantes)
    document.addEventListener('scroll', () => {
      this.hideQuickActionButton();
    });
    
    // Listener para escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideQuickActionButton();
        this.removeTooltips();
      }
    });
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_SELECTED_TEXT':
          this.handleGetSelectedText(sendResponse);
          return true;
          
        case 'SHOW_QUICK_RESULT':
          this.handleShowQuickResult(message.payload);
          break;
          
        case 'INJECT_RESULT':
          this.handleInjectResult(message.payload);
          break;
          
        case 'MODEL_LOADED':
          this.modelStatus = { isLoaded: true, ...message.payload };
          this.updateQuickActionButton();
          break;
          
        case 'MODEL_UNLOADED':
          this.modelStatus = { isLoaded: false };
          this.updateQuickActionButton();
          break;
          
        case 'MODEL_LOADING_PROGRESS':
          this.showLoadingIndicator(message.payload);
          break;
          
        default:
          console.log('Mensaje desconocido:', message.type);
      }
    });
  }
  
  async checkModelStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_MODEL_STATUS' 
      });
      this.modelStatus = response;
    } catch (error) {
      console.error('Error verificando estado del modelo:', error);
    }
  }
  
  handleGetSelectedText(sendResponse) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    let position = null;
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      position = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      };
    }
    
    sendResponse({
      text: selectedText,
      position: position,
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      success: true
    });
  }
  
  handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    this.hideQuickActionButton();
    
    if (selectedText.length < 10) {
      this.lastSelectedText = '';
      return;
    }
    
    if (selectedText === this.lastSelectedText) {
      return;
    }
    
    this.lastSelectedText = selectedText;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    this.selectionData = {
      text: selectedText,
      position: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY + rect.height + 5,
        width: rect.width,
        height: rect.height
      },
      range: range.cloneRange()
    };
    
    // Notificar al background script
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      payload: {
        text: selectedText,
        position: this.selectionData.position,
        url: window.location.href,
        title: document.title
      }
    });
    
    this.showQuickActionButton();
  }
  
  showQuickActionButton() {
    if (!this.selectionData || !this.modelStatus.isLoaded) {
      return;
    }
    
    this.hideQuickActionButton();
    
    const button = document.createElement('div');
    button.className = 'localloom-element localloom-quick-action';
    button.innerHTML = `
      <div class="localloom-quick-content">
        <div class="localloom-quick-icon">🧠</div>
        <div class="localloom-quick-text">Procesar con LocalLoom</div>
        <div class="localloom-quick-arrow">▼</div>
      </div>
      <div class="localloom-quick-menu" style="display: none;">
        <button class="localloom-quick-btn" data-task="summarize">📝 Resumir</button>
        <button class="localloom-quick-btn" data-task="rewrite">✏️ Reescribir</button>
        <button class="localloom-quick-btn" data-task="counter_argument">🤔 Contrargumento</button>
        <button class="localloom-quick-btn" data-task="question">❓ Pregunta reflexiva</button>
      </div>
    `;
    
    const pos = this.selectionData.position;
    button.style.cssText = `
      position: absolute;
      top: ${pos.y}px;
      left: ${pos.x}px;
      z-index: 10000;
      transform: translateX(-50%);
    `;
    
    const content = button.querySelector('.localloom-quick-content');
    const menu = button.querySelector('.localloom-quick-menu');
    
    content.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isMenuVisible = menu.style.display !== 'none';
      menu.style.display = isMenuVisible ? 'none' : 'block';
    });
    
    menu.addEventListener('click', (e) => {
      if (e.target.classList.contains('localloom-quick-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const task = e.target.dataset.task;
        this.processTextQuickly(task);
      }
    });
    
    document.body.appendChild(button);
    this.quickActionButton = button;
    
    setTimeout(() => {
      this.hideQuickActionButton();
    }, 10000);
  }
  
  hideQuickActionButton() {
    if (this.quickActionButton) {
      this.quickActionButton.remove();
      this.quickActionButton = null;
    }
  }
  
  updateQuickActionButton() {
    if (this.quickActionButton && this.selectionData) {
      if (this.modelStatus.isLoaded) {
        this.quickActionButton.style.opacity = '1';
        this.quickActionButton.style.pointerEvents = 'auto';
      } else {
        this.quickActionButton.style.opacity = '0.5';
        this.quickActionButton.style.pointerEvents = 'none';
      }
    }
  }
  
  async processTextQuickly(task) {
    if (!this.selectionData || !this.modelStatus.isLoaded) {
      this.showNotification('Modelo no está cargado', 'error');
      return;
    }
    
    this.hideQuickActionButton();
    this.showProcessingIndicator();
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'QUICK_PROCESS',
        payload: {
          text: this.selectionData.text,
          task: task,
          position: this.selectionData.position
        }
      });
      
      if (response.success) {
        this.hideProcessingIndicator();
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Error en procesamiento rápido:', error);
      this.hideProcessingIndicator();
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }
  
  handleShowQuickResult(payload) {
    const { result, position, task } = payload;
    this.showResultTooltip(result, position, task);
  }
  
  handleInjectResult(payload) {
    const { result, position } = payload;
    this.showResultTooltip(result, position);
  }
  
  showResultTooltip(result, position, task = null) {
    this.removeTooltips();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'localloom-element localloom-tooltip';
    
    const taskInfo = task ? this.getTaskInfo(task) : null;
    
    tooltip.innerHTML = `
      <div class="localloom-tooltip-header">
        <div class="localloom-tooltip-title">
          ${taskInfo ? taskInfo.icon + ' ' + taskInfo.label : '🧠 LocalLoom'}
        </div>
        <button class="localloom-tooltip-close">×</button>
      </div>
      <div class="localloom-tooltip-content">
        ${this.formatResult(result)}
      </div>
      <div class="localloom-tooltip-actions">
        <button class="localloom-btn localloom-btn-copy" data-text="${this.escapeHtml(result)}">📋 Copiar</button>
        <button class="localloom-btn localloom-btn-save" data-result="${this.escapeHtml(result)}">💾 Guardar</button>
        <button class="localloom-btn localloom-btn-close">Cerrar</button>
      </div>
    `;
    
    if (position) {
      tooltip.style.cssText = `
        position: absolute;
        top: ${position.y + 10}px;
        left: ${position.x}px;
        max-width: 400px;
        z-index: 10001;
      `;
    } else {
      tooltip.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 500px;
        z-index: 10001;
      `;
    }
    
    this.setupTooltipListeners(tooltip, result);
    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;
    
    setTimeout(() => {
      this.removeTooltips();
    }, 30000);
  }
  
  setupTooltipListeners(tooltip, result) {
    tooltip.querySelector('.localloom-tooltip-close').addEventListener('click', () => {
      this.removeTooltips();
    });
    
    tooltip.querySelector('.localloom-btn-close').addEventListener('click', () => {
      this.removeTooltips();
    });
    
    tooltip.querySelector('.localloom-btn-copy').addEventListener('click', () => {
      this.copyToClipboard(result);
    });
    
    tooltip.querySelector('.localloom-btn-save').addEventListener('click', () => {
      this.saveResult(result);
    });
  }
  
  removeTooltips() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
    document.querySelectorAll('.localloom-tooltip').forEach(el => el.remove());
  }
  
  showProcessingIndicator() {
    if (!this.selectionData) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'localloom-element localloom-processing';
    indicator.innerHTML = `
      <div class="localloom-processing-content">
        <div class="localloom-spinner"></div>
        <span>Procesando...</span>
      </div>
    `;
    
    const pos = this.selectionData.position;
    indicator.style.cssText = `
      position: absolute;
      top: ${pos.y}px;
      left: ${pos.x}px;
      z-index: 10000;
      transform: translateX(-50%);
    `;
    
    document.body.appendChild(indicator);
    this.processingIndicator = indicator;
  }
  
  hideProcessingIndicator() {
    if (this.processingIndicator) {
      this.processingIndicator.remove();
      this.processingIndicator = null;
    }
  }
  
  showLoadingIndicator(payload) {
    const { progress, text } = payload;
    
    if (!this.loadingIndicator) {
      const indicator = document.createElement('div');
      indicator.className = 'localloom-element localloom-loading';
      indicator.innerHTML = `
        <div class="localloom-loading-content">
          <div class="localloom-loading-header">🧠 LocalLoom</div>
          <div class="localloom-loading-text">Cargando modelo...</div>
          <div class="localloom-loading-bar">
            <div class="localloom-loading-progress"></div>
          </div>
        </div>
      `;
      
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10002;
      `;
      
      document.body.appendChild(indicator);
      this.loadingIndicator = indicator;
    }
    
    const progressBar = this.loadingIndicator.querySelector('.localloom-loading-progress');
    const textEl = this.loadingIndicator.querySelector('.localloom-loading-text');
    
    progressBar.style.width = `${progress}%`;
    textEl.textContent = text;
    
    if (progress >= 100) {
      setTimeout(() => {
        if (this.loadingIndicator) {
          this.loadingIndicator.remove();
          this.loadingIndicator = null;
        }
      }, 2000);
    }
  }
  
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Texto copiado al portapapeles', 'success');
    } catch (error) {
      console.error('Error copiando texto:', error);
      this.showNotification('Error copiando texto', 'error');
    }
  }
  
  async saveResult(result) {
    if (!this.selectionData) return;
    
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_RESULT',
        payload: {
          originalText: this.selectionData.text,
          result: result,
          task: 'quick_process',
          metadata: {
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
          }
        }
      });
      
      this.showNotification('Resultado guardado', 'success');
    } catch (error) {
      console.error('Error guardando resultado:', error);
      this.showNotification('Error guardando resultado', 'error');
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `localloom-element localloom-notification localloom-notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10003;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    
    notification.style.background = colors[type] || colors.info;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }
  
  getTaskInfo(task) {
    const taskMap = {
      summarize: { label: 'Resumir', icon: '📝' },
      rewrite: { label: 'Reescribir', icon: '✏️' },
      counter_argument: { label: 'Contrargumento', icon: '🤔' },
      question: { label: 'Pregunta reflexiva', icon: '❓' }
    };
    
    return taskMap[task] || { label: 'Procesado', icon: '🧠' };
  }
  
  formatResult(text) {
    return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
  }
  
  injectStyles() {
    if (document.getElementById('localloom-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'localloom-styles';
    style.textContent = `
      .localloom-element {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        box-sizing: border-box !important;
      }
      
      .localloom-quick-action {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        overflow: hidden;
      }
      
      .localloom-quick-content {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        background: white;
        transition: background-color 0.2s;
      }
      
      .localloom-quick-content:hover {
        background: #f8fafc;
      }
      
      .localloom-quick-icon {
        font-size: 16px;
      }
      
      .localloom-quick-text {
        font-weight: 500;
        color: #374151;
        white-space: nowrap;
      }
      
      .localloom-quick-arrow {
        color: #9ca3af;
        font-size: 12px;
      }
      
      .localloom-quick-menu {
        border-top: 1px solid #e2e8f0;
        background: white;
      }
      
      .localloom-quick-btn {
        display: block;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: white;
        text-align: left;
        cursor: pointer;
        color: #374151;
        font-size: 13px;
        transition: background-color 0.2s;
      }
      
      .localloom-quick-btn:hover {
        background: #f3f4f6;
      }
      
      .localloom-tooltip {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        max-width: 400px;
      }
      
      .localloom-tooltip-header {
        padding: 12px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
      }
      
      .localloom-tooltip-title {
        font-weight: 600;
        font-size: 14px;
      }
      
      .localloom-tooltip-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
      }
      
      .localloom-tooltip-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .localloom-tooltip-content {
        padding: 16px;
        color: #374151;
        max-height: 300px;
        overflow-y: auto;
        line-height: 1.6;
      }
      
      .localloom-tooltip-actions {
        padding: 12px 16px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .localloom-btn {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        color: #374151;
        transition: all 0.2s;
      }
      
      .localloom-btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
      
      .localloom-processing {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
      }
      
      .localloom-processing-content {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #374151;
        font-weight: 500;
      }
      
      .localloom-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e2e8f0;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: localloom-spin 1s linear infinite;
      }
      
      @keyframes localloom-spin {
        to { transform: rotate(360deg); }
      }
      
      .localloom-loading {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        padding: 16px;
        min-width: 250px;
      }
      
      .localloom-loading-header {
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
      }
      
      .localloom-loading-text {
        color: #6b7280;
        font-size: 13px;
        margin-bottom: 12px;
      }
      
      .localloom-loading-bar {
        background: #e2e8f0;
        border-radius: 10px;
        height: 4px;
        overflow: hidden;
      }
      
      .localloom-loading-progress {
        background: linear-gradient(90deg, #3b82f6, #667eea);
        height: 100%;
        border-radius: 10px;
        transition: width 0.3s ease;
        width: 0%;
      }
      
      .localloom-notification {
        border-radius: 8px;
        animation: localloom-slide-in 0.3s ease;
      }
      
      @keyframes localloom-slide-in {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Inicializar el content script
const localLoomContent = new LocalLoomContentScript();

// Notificar al background que el content script está listo
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  payload: {
    url: window.location.href,
    title: document.title
  }
}).catch(error => {
  console.log('Background script no disponible aún:', error.message);
});

console.log('LocalLoom content script cargado'); 