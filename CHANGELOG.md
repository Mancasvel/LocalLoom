# Changelog - LocalLoom

## [1.0.0] - 2024-01-XX

### ✅ Actualizaciones de Librerías

#### Dependencies
- **@mlc-ai/web-llm**: Actualizado a `^0.2.46` (desde 0.2.0)
- **@rollup/plugin-commonjs**: Actualizado a `^26.0.0` (desde 25.0.0)
- **@rollup/plugin-node-resolve**: Actualizado a `^15.2.0` (desde 15.0.0)
- **@rollup/plugin-terser**: Actualizado a `^0.4.4` (desde 0.4.0)
- **rollup**: Actualizado a `^4.0.0` (desde 3.20.0)
- **rollup-plugin-css-only**: Actualizado a `^4.5.0` (desde 4.3.0)
- **rollup-plugin-svelte**: Actualizado a `^7.2.0` (desde 7.1.2)
- **svelte**: Actualizado a `^4.2.0` (desde 4.0.0)

#### Configuration
- **package.json**: Agregado `"type": "module"` para soporte ES modules
- **rollup.config.js**: Corregida importación de terser (default import)
- **rollup.config.js**: Agregado `preferBuiltins: false` para mejor compatibilidad

### 🔧 Actualizaciones de WebLLM API

#### Background Service Worker
- **API**: Migrado de `ChatModule` a `MLCEngine`
- **Import**: Cambiado a `import * as webllm from '@mlc-ai/web-llm'`
- **Inicialización**: Nuevo formato con callback de progreso
- **Generación**: API OpenAI-compatible con `chat.completions.create()`
- **Parámetros**: Cambiado `max_gen_len` a `max_tokens`

#### Modelos Disponibles
- **TinyLlama**: Actualizado a `TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC`
- **Llama-2**: Actualizado a `Llama-2-7b-chat-hf-q4f16_1-MLC`
- **Gemma**: Agregado `gemma-2b-it-q4f16_1-MLC` (nuevo modelo)

### 🎨 Mejoras de UI

#### Accesibilidad
- **Labels**: Agregados atributos `for` e `id` para asociación correcta
- **A11y**: Eliminadas advertencias de accesibilidad en Svelte

### 📁 Estructura de Build

#### Archivos Generados
- ✅ `popup/bundle.js` (8.7KB)
- ✅ `popup/bundle.css` (1.7KB)  
- ✅ `popup/bundle.js.map` (108KB)
- ✅ Sin warnings o errores en build

### 🚀 Compatibilidad

#### Browser Support
- **Chrome**: 113+ (con WebGPU habilitado)
- **Edge**: 113+ (con WebGPU habilitado)
- **WebGPU**: Requerido para aceleración por hardware

#### Node.js
- **Versión**: 16+ recomendado
- **ES Modules**: Soporte completo

### 📚 Documentación Actualizada

#### Archivos Actualizados
- **models/README.md**: Nuevos modelos y API WebLLM v0.2.46+
- **DEVELOPMENT.md**: Ejemplos actualizados de API
- **QUICKSTART.md**: Instrucciones de instalación actualizadas

### 🔧 Breaking Changes

#### API Changes
- `ChatModule` → `MLCEngine`
- `generate()` → `chat.completions.create()`
- `max_gen_len` → `max_tokens`
- Callbacks de progreso ahora usan opciones en `reload()`

#### Model IDs
- Todos los modelos ahora requieren sufijo `-MLC`
- Nombres de modelos actualizados

### 📝 Migration Guide

Para actualizar desde versión anterior:

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Actualizar código WebLLM**:
   ```javascript
   // Antes
   import { ChatModule } from '@mlc-ai/web-llm';
   const engine = new ChatModule();
   const response = await engine.generate(prompt, options);
   
   // Ahora
   import * as webllm from '@mlc-ai/web-llm';
   const engine = new webllm.MLCEngine();
   const response = await engine.chat.completions.create({
     messages: [{ role: 'user', content: prompt }],
     ...options
   });
   ```

3. **Actualizar IDs de modelos**:
   ```javascript
   // Antes: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1'
   // Ahora: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'
   ```

### 🐛 Bug Fixes

- ✅ Corregido error de importación de terser
- ✅ Eliminadas advertencias de tipo de módulo
- ✅ Solucionadas advertencias de accesibilidad
- ✅ Compatibilidad con ES modules

### ⚡ Performance

- **Bundle size**: Optimizado con tree shaking mejorado
- **Loading**: Callbacks de progreso más precisos
- **Memory**: Mejor gestión de memoria con MLCEngine 