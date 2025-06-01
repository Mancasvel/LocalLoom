# 🚀 LocalLoom - Instrucciones Rápidas

## ❌ ¿Error de Timeout al cargar modelo?

### ✅ **Solución Inmediata:**

1. **Aumenté el timeout a 2 minutos** - Es normal que tarde
2. **El modelo descarga ~600MB** - Necesita buena conexión
3. **Mantén Chrome abierto** - No cierres la pestaña

### 📋 **Pasos para resolver:**

1. **Verifica WebGPU** (recomendado pero no obligatorio):
   ```
   chrome://flags/#enable-unsafe-webgpu
   ```
   - Buscar "WebGPU" 
   - Activar "Unsafe WebGPU"
   - Reiniciar Chrome

2. **Cargar la extensión:**
   ```
   chrome://extensions/
   ```
   - Modo desarrollador: ON
   - "Cargar extensión sin empaquetar"
   - Seleccionar carpeta LocalLoom

3. **Primera carga del modelo:**
   - Clic en icono LocalLoom 🧠
   - "Cargar Modelo Local"
   - **ESPERAR 2-5 minutos** (primera vez)
   - Ver barra de progreso

### 🔧 **Si sigue fallando:**

**Opción A - Reload extensión:**
```
chrome://extensions/ > LocalLoom > Icono reload
```

**Opción B - Console para debug:**
```
F12 > Console > Ver errores de WebLLM
```

**Opción C - Verificar memoria:**
- Cerrar otras pestañas
- Necesitas ~4GB RAM libre

### 💡 **Configuración Óptima:**

- **Chrome 113+** ✅
- **RAM: 4GB+** ✅  
- **Internet: Estable** ✅
- **WebGPU: Habilitado** (opcional)

### 🎯 **Una vez cargado:**

1. **Seleccionar texto** en cualquier web
2. **Botón flotante** aparece automáticamente  
3. **Elegir tarea**: Resumir, Reescribir, etc.
4. **¡Listo!** - 100% local, sin servidores

---

**📞 Si nada funciona:**
- El modelo WebLLM puede estar en mantenimiento
- Intenta en unas horas
- Verifica que no tengas antivirus bloqueando 