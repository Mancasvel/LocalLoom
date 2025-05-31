# 🧠 LocalLoom

Una extensión de navegador que utiliza modelos de lenguaje local para procesar texto directamente en tu navegador usando WebLLM, WebGPU y WASM.

## ✨ Características

- **Procesamiento Local**: Los modelos corren completamente en tu navegador, sin enviar datos a servidores externos
- **Múltiples Tareas**: Resumen, reescritura, contrargumentos y preguntas reflexivas
- **Selección Inteligente**: Procesa texto seleccionado en cualquier página web
- **Almacenamiento Local**: Guarda resultados usando IndexedDB
- **Interfaz Moderna**: Construida con Svelte para una experiencia fluida
- **Aceleración por Hardware**: Aprovecha WebGPU para rendimiento optimizado

## 🚀 Tecnologías

- **WebLLM**: Ejecución de modelos de lenguaje en el navegador
- **WebGPU + WASM**: Aceleración por hardware y rendimiento optimizado
- **Svelte**: Framework reactivo para la interfaz
- **Chrome Extension API (Manifest V3)**: Integración nativa con el navegador
- **IndexedDB**: Almacenamiento persistente local
- **Rollup**: Bundling y optimización

## 📁 Estructura del Proyecto

```
LocalLoom/
├── manifest.json              # Configuración de la extensión
├── package.json              # Dependencias y scripts
├── rollup.config.js          # Configuración de build
├── popup/
│   ├── popup.html           # HTML del popup
│   ├── bundle.js            # Bundle compilado de Svelte
│   └── bundle.css           # Estilos compilados
├── src/
│   ├── popup/
│   │   ├── App.svelte       # Componente principal
│   │   └── main.js          # Punto de entrada
│   ├── stores/
│   │   └── stores.js        # Estado global con Svelte stores
│   └── utils/
│       └── messaging.js     # Utilidades de comunicación
├── content/
│   └── content-script.js    # Script inyectado en páginas
├── background/
│   └── service-worker.js    # Background service worker
├── utils/
│   ├── messaging.js         # Comunicación entre componentes
│   └── storage.js           # IndexedDB y localStorage helpers
├── icons/                   # Iconos de la extensión
└── models/                  # Metadatos de modelos (sin pesos)
```

## 🛠 Instalación y Desarrollo

### Prerrequisitos

- Node.js 16+
- Navegador compatible con WebGPU (Chrome 113+, Edge 113+)

### Configuración

1. **Clonar e instalar dependencias:**
```bash
npm install
```

2. **Compilar la aplicación:**
```bash
npm run build
```

3. **Desarrollo con recarga automática:**
```bash
npm run dev
```

### Cargar en Chrome

1. Abrir Chrome y navegar a `chrome://extensions/`
2. Activar "Modo de desarrollador"
3. Hacer clic en "Cargar extensión sin empaquetar"
4. Seleccionar la carpeta del proyecto LocalLoom

## 📖 Uso

### Primera Configuración

1. **Abrir la extensión** haciendo clic en el icono de LocalLoom
2. **Cargar modelo** presionando "Cargar Modelo Local"
3. **Esperar** a que se descargue y configure el modelo (~600MB para TinyLlama)

### Procesamiento de Texto

1. **Seleccionar texto** en cualquier página web
2. **Abrir popup** de LocalLoom 
3. **Elegir tarea**: Resumir, Reescribir, Contrargumento, o Pregunta reflexiva
4. **Procesar** y obtener resultado
5. **Guardar** resultado localmente si es útil

### Acceso Rápido

- **Botón flotante**: Aparece automáticamente al seleccionar texto
- **Menú contextual**: Click derecho en texto seleccionado → "Procesar con LocalLoom"
- **Resultado en tooltip**: Se muestra directamente en la página

## 🧩 Arquitectura

### Comunicación de Mensajes

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup     │◄──►│ Background      │◄──►│ Content Script  │
│  (Svelte)   │    │ Service Worker  │    │   (Injection)   │
│             │    │   (WebLLM)      │    │                 │
└─────────────┘    └─────────────────┘    └─────────────────┘
       │                     │                       │
       ▼                     ▼                       ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Svelte      │    │ Local LLM       │    │ Page DOM        │
│ Stores      │    │ Processing      │    │ Manipulation    │
└─────────────┘    └─────────────────┘    └─────────────────┘
```

### Almacenamiento

- **localStorage**: Configuraciones simples y preferencias
- **IndexedDB**: Resultados procesados e historial detallado
- **Chrome Storage**: Estado compartido entre componentes

## 🔧 API de Mensajes

### Popup ↔ Background

```javascript
// Cargar modelo
{ type: 'LOAD_MODEL' }

// Procesar texto
{ 
  type: 'PROCESS_TEXT', 
  payload: { text: '...', task: 'summarize' } 
}

// Guardar resultado
{ 
  type: 'SAVE_RESULT', 
  payload: { originalText: '...', result: '...', task: '...' } 
}
```

### Background ↔ Content Script

```javascript
// Obtener texto seleccionado
{ type: 'GET_SELECTED_TEXT' }

// Inyectar resultado en página
{ 
  type: 'INJECT_RESULT', 
  payload: { result: '...', position: { x: 100, y: 100 } } 
}

// Procesamiento rápido
{ 
  type: 'QUICK_PROCESS', 
  payload: { text: '...', position: { x: 100, y: 100 } } 
}
```

## 🎯 Tareas Disponibles

| Tarea | Descripción | Prompt Base |
|-------|-------------|-------------|
| **Resumir** | Genera un resumen conciso | "Resume el siguiente texto de manera concisa y clara:" |
| **Reescribir** | Mejora claridad y estructura | "Reescribe el siguiente texto mejorando su claridad y estructura:" |
| **Contrargumento** | Proporciona perspectiva alternativa | "Proporciona un contrargumento balanceado al siguiente texto:" |
| **Pregunta** | Genera pregunta reflexiva | "Genera una pregunta reflexiva e interesante basada en el siguiente texto:" |

## 🔒 Privacidad y Seguridad

- **100% Local**: Ningún dato se envía a servidores externos
- **Sin Tracking**: No se recopila información personal
- **Almacenamiento Seguro**: Datos guardados solo localmente en tu navegador
- **Permisos Mínimos**: Solo solicita permisos necesarios para funcionar

## 🚧 Estado del Proyecto

Este es un **esqueleto base** para el desarrollo. Características por implementar:

- [ ] Selección de modelos alternativos
- [ ] Historial y gestión de resultados guardados
- [ ] Configuraciones avanzadas de prompts
- [ ] Exportación de resultados
- [ ] Temas y personalización de UI
- [ ] Métricas de rendimiento
- [ ] Optimizaciones de memoria

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit de cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🐛 Problemas Conocidos

- WebGPU requiere habilitación manual en algunos navegadores
- Modelos grandes pueden requerir mucha memoria RAM
- Primera carga del modelo puede ser lenta según conexión

## 📞 Soporte

Para problemas o preguntas:
- Crear issue en GitHub
- Verificar console del navegador para logs de debug
- Asegurar que WebGPU está habilitado en `chrome://flags`