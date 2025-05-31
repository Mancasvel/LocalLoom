# 🚀 Inicio Rápido - LocalLoom

Guía para poner en funcionamiento LocalLoom en menos de 5 minutos.

## ⚡ Instalación Rápida

### 1. Preparar el Entorno

```bash
# Clonar o descargar el proyecto
cd LocalLoom

# Instalar dependencias
npm install

# Compilar la extensión
npm run build
```

### 2. Habilitar WebGPU (Requerido)

1. Abrir Chrome
2. Ir a `chrome://flags`
3. Buscar "WebGPU"
4. Habilitar `#enable-unsafe-webgpu`
5. **Reiniciar Chrome**

### 3. Cargar la Extensión

1. Abrir `chrome://extensions/`
2. Activar **"Modo de desarrollador"** (esquina superior derecha)
3. Hacer clic en **"Cargar extensión sin empaquetar"**
4. Seleccionar la carpeta `LocalLoom`
5. ✅ La extensión aparecerá en la toolbar

> **Nota**: La extensión funciona sin iconos inicialmente. Para agregar iconos, ve a la sección [Crear Iconos](#crear-iconos-opcional).

## 🧠 Primer Uso

### 1. Cargar el Modelo

1. Hacer clic en el icono de LocalLoom en la toolbar (aparece como puzzle piece)
2. Presionar **"Cargar Modelo Local"**
3. Esperar ~2-3 minutos (descarga ~600MB)
4. ✅ Verás "Modelo cargado" cuando esté listo

### 2. Procesar Texto

1. Ir a cualquier página web
2. **Seleccionar texto** con el mouse
3. Hacer clic en el icono de LocalLoom
4. Elegir una tarea (Resumir, Reescribir, etc.)
5. Presionar **"Procesar Texto"**
6. ✅ Ver el resultado generado

### 3. Acceso Rápido

- **Botón flotante**: Aparece al seleccionar texto
- **Menú contextual**: Click derecho → "Procesar con LocalLoom"
- **Tooltip**: Resultado se muestra directamente en la página

## 🎨 Crear Iconos (Opcional)

La extensión funciona sin iconos, pero puedes agregar iconos personalizados:

### Método 1: Generador Automático
1. Abrir `create_icons.html` en Chrome
2. Click derecho en cada icono → "Guardar imagen como..."
3. Guardar en `icons/` como: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
4. Restaurar iconos en `manifest.json`

### Método 2: Iconos Personalizados
1. Crear o descargar iconos de 16x16, 32x32, 48x48, 128x128 píxeles
2. Guardar en la carpeta `icons/`
3. Restaurar la configuración en `manifest.json`:

```json
{
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "LocalLoom",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## 🔧 Solución de Problemas

### ❌ "Could not load icon"
- **Solución**: Los iconos son opcionales, la extensión funciona sin ellos
- **Para agregarlos**: Usar el generador `create_icons.html` o iconos personalizados

### ❌ "WebGPU not supported"
- Verificar que WebGPU está habilitado en `chrome://flags`
- Usar Chrome 113+ o Edge 113+
- Verificar que tu GPU es compatible

### ❌ "Error cargando modelo"
- Verificar conexión a internet
- Liberar memoria RAM (cerrar otras páginas)
- Probar con modelo más ligero

### ❌ "Extensión no aparece"
- Verificar que está en modo desarrollador
- Recargar la extensión en `chrome://extensions/`
- Verificar que `npm run build` se ejecutó sin errores

## 📝 Tareas Disponibles

| Tarea | Descripción | Ejemplo |
|-------|-------------|---------|
| **Resumir** | Genera resumen conciso | "Este artículo habla sobre..." |
| **Reescribir** | Mejora claridad | Texto más claro y estructurado |
| **Contrargumento** | Perspectiva alternativa | "Sin embargo, se podría argumentar..." |
| **Pregunta** | Genera pregunta reflexiva | "¿Qué implicaciones tiene esto?" |

## 🎯 Casos de Uso

- **Estudiantes**: Resumir artículos académicos
- **Profesionales**: Reescribir emails y documentos
- **Investigadores**: Generar preguntas de investigación
- **Escritores**: Obtener perspectivas alternativas

## 🔄 Desarrollo

```bash
# Modo desarrollo (recarga automática)
npm run dev

# Build para producción
npm run build

# Ver logs de debugging
# F12 → Console (en cualquier página)
# chrome://extensions/ → "inspeccionar vistas" → "service worker"
```

## 📚 Próximos Pasos

1. Leer `README.md` para documentación completa
2. Ver `DEVELOPMENT.md` para desarrollo avanzado
3. Explorar `src/` para entender el código
4. Personalizar prompts en `background/service-worker.js`
5. Agregar iconos personalizados usando `create_icons.html`

## 🆘 Ayuda

- **Documentación**: `README.md` y `DEVELOPMENT.md`
- **Problemas**: Crear issue en GitHub
- **Logs**: Console del navegador para debugging

¡Listo! 🎉 LocalLoom está funcionando y procesando texto localmente en tu navegador. 