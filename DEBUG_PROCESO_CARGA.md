# 🔍 LocalLoom - Debug Completo del Proceso de Carga

## 📋 **Proceso Real de Carga de WebLLM**

### 🎯 **Pasos que WebLLM sigue internamente:**

1. **Verificación del modelo**: Buscar en el registro interno de modelos
2. **Descarga de metadatos**: config.json, tokenizer.json 
3. **Descarga de pesos**: archivos .wasm/.bin (600MB para TinyLlama)
4. **Compilación**: Optimización para WebGPU/WASM
5. **Carga en memoria**: Inicialización del modelo

### 🔧 **Comando de Debug Completo**

**Ejecuta esto en Chrome Console (F12) mientras cargas el modelo:**

```javascript
// MONITOR COMPLETO DE CARGA
async function debugCompletoLocalLoom() {
    console.log('🔍 === DEBUG COMPLETO LOCALLOOM ===');
    
    // 1. Estado inicial
    console.log('🚀 1. VERIFICACIÓN INICIAL');
    console.log('Chrome:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
    console.log('WebGPU:', !!navigator.gpu);
    console.log('WASM:', !!WebAssembly);
    
    // 2. Test WebLLM disponible
    console.log('\n📦 2. VERIFICANDO WEBLLM');
    try {
        // Verificar si está disponible globalmente
        if (typeof webllm !== 'undefined') {
            console.log('✅ WebLLM global disponible');
        } else {
            console.log('❌ WebLLM global NO disponible');
        }
        
        // Intentar importar dinámicamente
        const webllmModule = await import('https://esm.run/@mlc-ai/web-llm');
        console.log('✅ WebLLM importado dinámicamente:', webllmModule);
        
        // Test crear cliente
        const testClient = new webllmModule.ChatWorkerClient();
        console.log('✅ ChatWorkerClient creado:', testClient);
        
        // Verificar métodos disponibles
        console.log('🎯 Métodos disponibles:', {
            hasReload: typeof testClient.reload === 'function',
            hasChat: !!testClient.chat,
            hasCompletions: !!testClient.chat?.completions,
            hasCreate: !!testClient.chat?.completions?.create
        });
        
    } catch (error) {
        console.error('❌ Error con WebLLM:', error);
    }
    
    // 3. Monitor de red
    console.log('\n🌐 3. MONITOREANDO RED');
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('mlc')) {
            console.log('📥 WebLLM descarga:', url);
        }
        return originalFetch.apply(this, args);
    };
    
    // 4. Monitor del service worker
    console.log('\n🛠️ 4. MONITOREANDO SERVICE WORKER');
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type && event.data.type.includes('MODEL')) {
            console.log('📨 SW Message:', event.data);
        }
    });
    
    console.log('\n✅ Debug configurado. Ahora intenta cargar el modelo.');
    console.log('📊 Verás todos los logs aquí automáticamente.');
}

// Ejecutar debug
debugCompletoLocalLoom();
```

### 🎯 **Test Manual del Modelo**

**Para verificar si el modelo se puede cargar directamente:**

```javascript
// TEST DIRECTO DE WEBLLM
async function testDirectoWebLLM() {
    console.log('🧪 === TEST DIRECTO WEBLLM ===');
    
    try {
        // 1. Importar WebLLM
        const webllm = await import('https://esm.run/@mlc-ai/web-llm');
        console.log('✅ WebLLM importado');
        
        // 2. Crear engine
        const engine = new webllm.ChatWorkerClient();
        console.log('✅ Engine creado');
        
        // 3. Configurar callback
        const progressCallback = (progress) => {
            console.log(`⏳ ${Math.round(progress.progress * 100)}% - ${progress.text}`);
        };
        
        // 4. Intentar cargar TinyLlama
        console.log('📥 Cargando TinyLlama...');
        console.time('⏱️ Tiempo de carga');
        
        await engine.reload('TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', undefined, {
            progressCallback: progressCallback
        });
        
        console.timeEnd('⏱️ Tiempo de carga');
        console.log('✅ MODELO CARGADO EXITOSAMENTE');
        
        // 5. Test de generación
        console.log('🧠 Probando generación...');
        const response = await engine.chat.completions.create({
            messages: [{ role: 'user', content: 'Hola, ¿funciona?' }],
            max_tokens: 50
        });
        
        console.log('🎯 Respuesta:', response.choices[0].message.content);
        console.log('✅ TODO FUNCIONA PERFECTAMENTE');
        
    } catch (error) {
        console.error('❌ ERROR:', error);
        console.error('🔍 Detalles:', error.message);
        console.error('📚 Stack:', error.stack);
    }
}

// Ejecutar test directo
testDirectoWebLLM();
```

## 🔍 **Análisis de Problemas Comunes**

### Problem 1: "Failed to fetch"
```
❌ Indica: Error de red durante descarga
🔧 Solución: Verificar conexión, firewall, antivirus
```

### Problem 2: "Model not found"
```
❌ Indica: ID de modelo incorrecto
🔧 Solución: Verificar que sea exactamente 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'
```

### Problem 3: "Out of memory"
```
❌ Indica: RAM insuficiente
🔧 Solución: Cerrar otras pestañas, necesitas ~2GB libre
```

### Problem 4: "WebGPU not supported"
```
❌ Indica: GPU no compatible
🔧 Solución: Funciona igual con WASM (más lento)
```

### Problem 5: "Service Worker error"
```
❌ Indica: Error en la extensión
🔧 Solución: Recargar extensión en chrome://extensions
```

## 🎮 **Estados del Proceso**

### ✅ **Estado 1: Iniciando**
```
🚀 Iniciando carga de modelo WebLLM: TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC
🔧 Creando ChatWorkerClient...
✅ ChatWorkerClient creado exitosamente
```

### ✅ **Estado 2: Descargando**
```
📊 Progreso WebLLM: {progress: 0.1, text: "Downloading..."}
⏳ Progreso: 10% - Downloading...
📦 Descargado: 60.0MB / 600.0MB
```

### ✅ **Estado 3: Compilando** 
```
📊 Progreso WebLLM: {progress: 0.8, text: "Compiling..."}
⏳ Progreso: 80% - Compiling...
```

### ✅ **Estado 4: Completado**
```
✅ Modelo cargado exitosamente: TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC
🎯 API disponible: {hasChat: true, hasCompletions: true, hasCreate: true}
```

## 📞 **Si nada funciona**

1. **Prueba el test directo** - Si falla, es problema de WebLLM/red
2. **Verifica en otra pestaña** - Abre https://chat.webllm.ai/ 
3. **Revisa el service worker** - Pueden estar muriendo
4. **Intenta otro modelo** - Prueba 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC' (más pequeño)

---

**🔍 El debug te dirá exactamente dónde falla el proceso.** 