# 🔧 LocalLoom - Diagnóstico Completo

## ⚠️ **PROBLEMA: Service Worker Inactivo + Modelo No Carga**

### 🎯 **Soluciones Implementadas:**

## 1️⃣ **PERSISTENCIA DEL SERVICE WORKER**

### ✅ **Keep-alive automático cada 25 segundos**
- Previene que Chrome desactive el SW
- Mantiene el modelo en memoria
- Estado guardado en Chrome Storage

### ✅ **Recuperación automática de estado**
- Si el SW se desactiva, restaura el estado
- Recuerda si había un modelo cargado
- Reconexión automática del popup

---

## 2️⃣ **DIAGNÓSTICO PASO A PASO**

### 🔍 **Test Independiente de WebLLM**

**Abre este archivo para probar WebLLM fuera de la extensión:**
```
file:///C:/Users/manue/Desktop/LocalLoom/TEST_WEBLLM.html
```

**Sigue estos pasos:**
1. **Test WebGPU** - Verifica soporte de hardware
2. **Test WebLLM Import** - Verifica que se puede importar
3. **Test Cargar Modelo** - Intenta cargar TinyLlama
4. **Test Chat** - Prueba generación de texto

---

## 3️⃣ **VERIFICACIÓN DEL SERVICE WORKER**

### 📍 **Cómo verificar si está activo:**

1. **Abrir DevTools:**
   ```
   chrome://extensions/ → LocalLoom → "Service worker" (clic)
   ```

2. **Verificar logs:**
   ```javascript
   // Deberías ver estos logs cada 25 segundos:
   💓 Keep-alive ping
   ✅ Modelo sigue cargado en memoria
   ```

3. **Si no ves logs:**
   ```javascript
   // Ejecutar manualmente en Console:
   chrome.runtime.sendMessage({type: 'GET_MODEL_STATUS'})
   ```

---

## 4️⃣ **DIAGNÓSTICO AVANZADO**

### 🔧 **Ejecutar en Chrome Console (F12):**

```javascript
// === DIAGNÓSTICO COMPLETO LOCALLOOM ===
async function diagnosticoCompleto() {
    console.log('🔍 === DIAGNÓSTICO LOCALLOOM ===');
    
    // 1. Verificar extensión instalada
    try {
        const status = await chrome.runtime.sendMessage({type: 'GET_MODEL_STATUS'});
        console.log('✅ Extensión responde:', status);
    } catch (error) {
        console.error('❌ Extensión no responde:', error);
        console.log('💡 Solución: Recarga extensión en chrome://extensions');
        return;
    }
    
    // 2. Verificar WebGPU
    console.log('🎮 WebGPU:', !!navigator.gpu);
    if (navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            console.log('✅ WebGPU adapter:', !!adapter);
        } catch (e) {
            console.log('⚠️ WebGPU error:', e.message);
        }
    }
    
    // 3. Verificar Chrome version
    const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1];
    console.log('🌐 Chrome:', chromeVersion, chromeVersion >= 113 ? '✅' : '❌ Necesitas 113+');
    
    // 4. Test memoria disponible
    if (navigator.deviceMemory) {
        console.log('💾 RAM dispositivo:', navigator.deviceMemory + 'GB');
        console.log('💡 Necesitas mínimo 4GB para TinyLlama');
    }
    
    // 5. Test conexión red
    console.log('🌐 Online:', navigator.onLine);
    
    console.log('🎯 Diagnóstico completo. Revisa los logs arriba.');
}

// Ejecutar diagnóstico
diagnosticoCompleto();
```

---

## 5️⃣ **SOLUCIONES POR CATEGORÍA**

### 🚫 **Service Worker Inactivo**

**Síntomas:**
- "Service worker inactivo" en chrome://extensions
- La extensión no responde
- Modelo se "olvida" al cerrar popup

**Soluciones:**
```bash
1. Abrir popup LocalLoom (esto activa keep-alive)
2. chrome://extensions → LocalLoom → Recargar
3. Cerrar y reabrir Chrome
4. Verificar que popup quede abierto unos segundos
```

### 🚫 **Modelo No Carga**

**Síntomas:**
- "Timeout: El mensaje tardó demasiado"
- Error de conexión
- Se queda en 0% progreso

**Soluciones por orden:**

1. **Verificar red:**
   ```bash
   - Conexión estable (600MB descarga)
   - Sin proxy/firewall bloqueando
   - Probar en navegación privada
   ```

2. **Verificar memoria:**
   ```bash
   - Cerrar otras pestañas Chrome
   - Mínimo 2GB RAM libre
   - Reiniciar Chrome si necesario
   ```

3. **Verificar WebLLM:**
   ```bash
   - Abrir TEST_WEBLLM.html
   - Seguir pasos 1-4
   - Si falla ahí, es problema de WebLLM/red
   ```

4. **Verificar extensión:**
   ```bash
   - chrome://extensions → LocalLoom → Recargar
   - F12 en popup → Console → Ver errores
   - Verificar manifest.json cargado
   ```

### 🚫 **WebGPU Issues**

**Síntomas:**
- "WebGPU no disponible"
- Funciona lento

**Soluciones:**
```bash
1. chrome://flags/#enable-unsafe-webgpu → Enabled
2. Reiniciar Chrome COMPLETAMENTE
3. Verificar GPU compatible (Intel/NVIDIA/AMD reciente)
4. Si falla, funciona con WASM (más lento pero funcional)
```

---

## 6️⃣ **COMANDOS DE EMERGENCIA**

### 🔄 **Reset Completo:**
```bash
1. chrome://extensions → LocalLoom → Quitar
2. Cerrar Chrome completamente
3. Volver a cargar carpeta LocalLoom
4. chrome://flags → Resetear WebGPU si cambió
5. Reiniciar Chrome
```

### 🧹 **Limpiar Estado:**
```javascript
// En Console del popup:
chrome.storage.local.clear();
chrome.storage.session.clear();
console.log('✅ Estado limpiado');
```

### 📊 **Monitoreo en Tiempo Real:**
```javascript
// En Console, monitorear Service Worker:
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type?.includes('MODEL')) {
        console.log('📨 SW:', msg);
    }
});
```

---

## 7️⃣ **ESTADOS NORMALES VS PROBLEMÁTICOS**

### ✅ **Estado Normal:**
```
🚀 LocalLoom popup iniciado
✅ Keep-alive inicializado  
🔄 Estado del modelo restaurado
📊 Progreso: 10% - Downloading...
📊 Progreso: 50% - Downloading...
📊 Progreso: 90% - Compiling...
✅ Modelo cargado exitosamente
💓 Keep-alive ping (cada 25s)
```

### ❌ **Estado Problemático:**
```
❌ Error importando WebLLM
❌ Service Worker no responde
❌ Failed to fetch
❌ Out of memory
❌ WebGPU not supported
```

---

## 🎯 **PRIORIDAD DE ACCIONES**

### 🥇 **ALTA PRIORIDAD:**
1. Verificar Service Worker activo
2. Mantener popup abierto 30+ segundos
3. Probar TEST_WEBLLM.html independiente
4. Verificar memoria RAM disponible

### 🥈 **MEDIA PRIORIDAD:**
1. Habilitar WebGPU en chrome://flags
2. Actualizar Chrome a 113+
3. Verificar conexión de red estable
4. Recargar extensión si falla

### 🥉 **BAJA PRIORIDAD:**
1. Reiniciar Chrome completamente
2. Probar en navegación privada
3. Verificar antivirus/firewall
4. Reset completo de la extensión

---

## 📞 **SI NADA FUNCIONA**

1. **Ejecuta diagnóstico completo** (código JavaScript arriba)
2. **Prueba TEST_WEBLLM.html** - Si falla, es WebLLM/red
3. **Verifica en otra máquina** - Si funciona, es tu entorno
4. **Reporta con logs completos** - Copy/paste output de Console

**El 90% de problemas se resuelven con:**
- ✅ Mantener popup abierto
- ✅ Verificar Service Worker activo  
- ✅ Buena conexión + memoria suficiente 