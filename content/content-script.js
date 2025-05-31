// Content Script para LocalLoom
// Captura texto seleccionado y maneja comunicación con background

let lastSelectedText = '';
let selectionTooltip = null;

// Escuchar mensajes del popup y background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SELECTED_TEXT':
      handleGetSelectedText(sendResponse);
      return true; // Respuesta asíncrona
      
    case 'INJECT_RESULT':
      handleInjectResult(message.payload);
      break;
      
    case 'HIGHLIGHT_TEXT':
      handleHighlightText(message.payload);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

/**
 * Obtiene el texto actualmente seleccionado
 */
function handleGetSelectedText(sendResponse) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  sendResponse({
    text: selectedText,
    success: true
  });
}

/**
 * Inyecta el resultado procesado en la página
 */
function handleInjectResult(payload) {
  const { result, position } = payload;
  
  // Crear un tooltip con el resultado
  createResultTooltip(result, position);
}

/**
 * Resalta texto en la página
 */
function handleHighlightText(payload) {
  const { text, color = '#ffeb3b' } = payload;
  
  // Buscar y resaltar texto en la página
  highlightTextInPage(text, color);
}

/**
 * Crear tooltip con resultado del LLM
 */
function createResultTooltip(result, position = null) {
  // Remover tooltip anterior si existe
  removeResultTooltip();
  
  const tooltip = document.createElement('div');
  tooltip.id = 'localloom-tooltip';
  tooltip.innerHTML = `
    <div class="localloom-tooltip-header">
      <span>🧠 LocalLoom</span>
      <button class="localloom-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="localloom-tooltip-content">
      ${result.replace(/\n/g, '<br>')}
    </div>
    <div class="localloom-tooltip-actions">
      <button class="localloom-btn" onclick="navigator.clipboard.writeText('${result.replace(/'/g, "\\'")}')">
        📋 Copiar
      </button>
      <button class="localloom-btn" onclick="document.getElementById('localloom-tooltip').remove()">
        Cerrar
      </button>
    </div>
  `;
  
  // Estilos del tooltip
  tooltip.style.cssText = `
    position: fixed;
    top: ${position?.y || 100}px;
    left: ${position?.x || 100}px;
    max-width: 400px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
  `;
  
  // Agregar estilos internos
  const style = document.createElement('style');
  style.textContent = `
    #localloom-tooltip .localloom-tooltip-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border-radius: 8px 8px 0 0;
      font-weight: 600;
      color: #374151;
    }
    
    #localloom-tooltip .localloom-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #localloom-tooltip .localloom-close:hover {
      color: #374151;
    }
    
    #localloom-tooltip .localloom-tooltip-content {
      padding: 16px;
      color: #374151;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
    
    #localloom-tooltip .localloom-tooltip-actions {
      padding: 12px 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      background: #f8fafc;
      border-radius: 0 0 8px 8px;
    }
    
    #localloom-tooltip .localloom-btn {
      padding: 6px 12px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      color: #374151;
    }
    
    #localloom-tooltip .localloom-btn:hover {
      background: #f3f4f6;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(tooltip);
  
  // Hacer el tooltip draggable
  makeTooltipDraggable(tooltip);
}

/**
 * Remover tooltip de resultado
 */
function removeResultTooltip() {
  const existing = document.getElementById('localloom-tooltip');
  if (existing) {
    existing.remove();
  }
}

/**
 * Hacer el tooltip draggable
 */
function makeTooltipDraggable(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  const header = element.querySelector('.localloom-tooltip-header');
  
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
      header.style.cursor = 'grabbing';
    }
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      xOffset = currentX;
      yOffset = currentY;
      
      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
  }
  
  function dragEnd() {
    if (isDragging) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      header.style.cursor = 'grab';
    }
  }
  
  header.style.cursor = 'grab';
}

/**
 * Resaltar texto en la página
 */
function highlightTextInPage(searchText, color) {
  // Remover highlights anteriores
  removeHighlights();
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  while (node = walker.nextNode()) {
    if (node.nodeValue.toLowerCase().includes(searchText.toLowerCase())) {
      textNodes.push(node);
    }
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    const regex = new RegExp(`(${escapeRegExp(searchText)})`, 'gi');
    const highlightedText = text.replace(regex, `<mark style="background-color: ${color}; padding: 2px 4px; border-radius: 3px;">$1</mark>`);
    
    if (highlightedText !== text) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = highlightedText;
      wrapper.className = 'localloom-highlight';
      textNode.parentNode.replaceChild(wrapper, textNode);
    }
  });
}

/**
 * Remover highlights
 */
function removeHighlights() {
  const highlights = document.querySelectorAll('.localloom-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
    parent.normalize();
  });
}

/**
 * Escapar caracteres especiales para regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Escuchar selección de texto
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

/**
 * Manejar selección de texto
 */
function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText && selectedText !== lastSelectedText) {
    lastSelectedText = selectedText;
    
    // Enviar texto seleccionado al background
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      payload: {
        text: selectedText,
        url: window.location.href,
        timestamp: Date.now()
      }
    });
    
    // Mostrar botón de acción rápida (opcional)
    showQuickActionButton(selection);
  } else if (!selectedText) {
    lastSelectedText = '';
    hideQuickActionButton();
  }
}

/**
 * Mostrar botón de acción rápida
 */
function showQuickActionButton(selection) {
  // Remover botón anterior
  hideQuickActionButton();
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const button = document.createElement('button');
  button.id = 'localloom-quick-action';
  button.innerHTML = '🧠';
  button.title = 'Procesar con LocalLoom';
  
  button.style.cssText = `
    position: fixed;
    top: ${rect.bottom + window.scrollY + 5}px;
    left: ${rect.left + window.scrollX}px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    z-index: 10000;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  `;
  
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'QUICK_PROCESS',
      payload: {
        text: lastSelectedText,
        position: { x: rect.left, y: rect.bottom + 5 }
      }
    });
    hideQuickActionButton();
  });
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(button);
  
  // Auto-hide después de 3 segundos
  setTimeout(hideQuickActionButton, 3000);
}

/**
 * Ocultar botón de acción rápida
 */
function hideQuickActionButton() {
  const button = document.getElementById('localloom-quick-action');
  if (button) {
    button.remove();
  }
}

// Inicialización
console.log('LocalLoom content script loaded');

// Notificar al background que el content script está listo
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  payload: {
    url: window.location.href,
    title: document.title
  }
}); 