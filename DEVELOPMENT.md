# 🛠 Guía de Desarrollo - LocalLoom

Esta guía te ayudará a configurar el entorno de desarrollo y entender la arquitectura del proyecto.

## 🚀 Configuración Inicial

### 1. Instalación de Dependencias

```bash
# Instalar dependencias
npm install

# Verificar que todo esté correcto
npm run build
```

### 2. Habilitar WebGPU en Chrome

1. Abrir `chrome://flags`
2. Buscar "WebGPU"
3. Habilitar `#enable-unsafe-webgpu`
4. Reiniciar Chrome

### 3. Modo Desarrollador

1. Abrir `chrome://extensions/`
2. Activar "Modo de desarrollador"
3. Cargar extensión desde la carpeta del proyecto

## 📁 Estructura de Desarrollo

### Flujo de Trabajo

```
src/ (código fuente)
  ↓ (Rollup compile)
popup/ (archivos compilados)
  ↓ (Chrome load)
Extensión funcionando
```

### Scripts Disponibles

```bash
# Desarrollo con recarga automática
npm run dev

# Build para producción
npm run build

# Limpiar archivos compilados
rm -rf popup/bundle.*
```

## 🧩 Arquitectura de Componentes

### 1. Popup (Frontend)

**Archivo**: `src/popup/App.svelte`

Responsabilidades:
- Interfaz de usuario principal
- Manejo de estado con Svelte stores
- Comunicación con background via messaging

### 2. Background (Motor LLM)

**Archivo**: `background/service-worker.js`

Responsabilidades:
- Carga y manejo de modelos WebLLM
- Procesamiento de texto con IA
- Coordinación entre popup y content scripts

### 3. Content Script (Inyección)

**Archivo**: `content/content-script.js`

Responsabilidades:
- Captura de texto seleccionado
- Inyección de resultados en páginas
- Interfaz de botón flotante

## 🔄 Sistema de Mensajes

### Tipos de Mensajes

```javascript
// Mensajes del Popup
'LOAD_MODEL'      // Cargar modelo LLM
'PROCESS_TEXT'    // Procesar texto con IA
'SAVE_RESULT'     // Guardar resultado
'GET_SELECTED_TEXT' // Obtener texto seleccionado

// Mensajes del Content Script  
'TEXT_SELECTED'   // Notificar texto seleccionado
'QUICK_PROCESS'   // Procesamiento rápido
'INJECT_RESULT'   // Mostrar resultado en página

// Mensajes del Background
'MODEL_LOADED'    // Modelo cargado exitosamente
'MODEL_LOADING_PROGRESS' // Progreso de carga
```

### Ejemplo de Comunicación

```javascript
// Desde popup a background
const response = await sendMessage({
  type: 'PROCESS_TEXT',
  payload: { text: 'Texto a procesar', task: 'summarize' }
});

// Desde background a content script
chrome.tabs.sendMessage(tabId, {
  type: 'INJECT_RESULT',
  payload: { result: 'Resultado procesado', position: { x: 100, y: 100 } }
});
```

## 🎨 Desarrollo de UI

### Svelte Stores

```javascript
// Estado global compartido
llmStore        // Estado del modelo LLM
selectedTextStore // Texto seleccionado actual
responseStore   // Última respuesta del LLM
settingsStore   // Configuraciones de usuario
```

### Estilos CSS

- Usar variables CSS para colores consistentes
- Responsive design para diferentes tamaños de popup
- Dark/light mode compatible

### Componentes Reusables

```svelte
<!-- Botón principal -->
<button class="primary-btn" on:click={handleClick}>
  {text}
</button>

<!-- Área de texto -->
<textarea bind:value={text} placeholder="Ingresa texto..."></textarea>
```

## 🔧 WebLLM Integration

### Inicialización

```javascript
import { ChatModule } from '@mlc-ai/web-llm';

const llmEngine = new ChatModule();
await llmEngine.reload('modelo-id');
```

### Generación de Texto

```javascript
const response = await llmEngine.generate(prompt, {
  temperature: 0.7,    // Creatividad (0-1)
  max_gen_len: 256,    // Longitud máxima
  top_p: 0.9          // Nucleus sampling
});
```

### Manejo de Errores

```javascript
try {
  await llmEngine.reload(modelId);
} catch (error) {
  console.error('Error cargando modelo:', error);
  // Manejar error específico
}
```

## 💾 Almacenamiento de Datos

### IndexedDB (Datos Grandes)

```javascript
import { saveResult, getResults } from './utils/storage.js';

// Guardar resultado procesado
await saveResult({
  originalText: 'texto original',
  result: 'texto procesado',
  task: 'summarize',
  timestamp: Date.now()
});

// Obtener resultados
const results = await getResults(10); // últimos 10
```

### localStorage (Configuraciones)

```javascript
import { saveToLocalStorage, getFromLocalStorage } from './utils/storage.js';

// Guardar configuración
saveToLocalStorage('userSettings', { theme: 'dark' });

// Obtener configuración
const settings = getFromLocalStorage('userSettings', { theme: 'light' });
```

## 🐛 Debugging

### Chrome DevTools

1. **Background Script**: `chrome://extensions/` → "inspeccionar vistas" → "service worker"
2. **Popup**: Click derecho en popup → "Inspeccionar"
3. **Content Script**: F12 en página → Console

### Logs Útiles

```javascript
// Background
console.log('Background received message:', message);

// Content Script  
console.log('Text selected:', selectedText);

// Popup
console.log('Model status:', $llmStore);
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| WebGPU not supported | Hardware/browser | Habilitar en chrome://flags |
| Model loading failed | Memoria insuficiente | Usar modelo más ligero |
| Message not received | Timing de carga | Agregar retry logic |

## 🧪 Testing

### Pruebas Manuales

1. **Carga de modelo**: Verificar progreso y éxito
2. **Selección de texto**: Probar en diferentes páginas
3. **Procesamiento**: Todas las tareas (resumir, reescribir, etc.)
4. **Almacenamiento**: Guardar y recuperar resultados
5. **UI**: Responsive en diferentes tamaños

### Casos de Prueba

```javascript
// Texto corto
const shortText = "Esta es una oración simple.";

// Texto largo  
const longText = "Lorem ipsum dolor sit amet..."; // 500+ palabras

// Texto con caracteres especiales
const specialText = "Texto con emojis 🧠 y símbolos @#$%";
```

## 📦 Build y Distribución

### Preparar para Producción

```bash
# Build optimizado
npm run build

# Verificar tamaño de bundles
ls -la popup/bundle.*

# Empaquetar extensión (opcional)
zip -r localloom.zip . -x "node_modules/*" "src/*" "*.git*"
```

### Optimizaciones

- Minificación automática en producción
- Tree shaking de dependencias no usadas  
- Compresión de assets CSS

## 🔄 Flujo de Contribución

1. **Fork** del repositorio
2. **Branch** para nueva feature: `git checkout -b feature/nueva-feature`
3. **Desarrollar** siguiendo las guías de estilo
4. **Testing** manual completo
5. **Commit** con mensaje descriptivo
6. **Pull Request** con descripción detallada

## 📚 Recursos Adicionales

- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [WebLLM Documentation](https://github.com/mlc-ai/web-llm)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)

## 💡 Tips de Desarrollo

1. **Usar console.log** abundantemente durante desarrollo
2. **Recargar extensión** después de cambios en background/content scripts
3. **Hot reload** funciona solo para popup con `npm run dev`
4. **Probar en diferentes páginas** para verificar compatibilidad
5. **Monitorear memoria** durante carga de modelos grandes 