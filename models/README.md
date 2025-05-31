# Modelos Locales para LocalLoom

Esta carpeta contiene metadatos y configuraciones para los modelos de lenguaje locales. Los pesos de los modelos se descargan automáticamente cuando se cargan por primera vez.

## Modelos Disponibles

### TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC
- **Tamaño**: ~600MB
- **Memoria RAM requerida**: ~1-2GB
- **Velocidad**: Rápida
- **Calidad**: Básica, ideal para tareas simples
- **Recomendado para**: Usuarios con hardware limitado

### gemma-2b-it-q4f16_1-MLC
- **Tamaño**: ~1.5GB  
- **Memoria RAM requerida**: ~3-4GB
- **Velocidad**: Moderada
- **Calidad**: Buena, equilibrado rendimiento/calidad
- **Recomendado para**: Uso general con hardware medio

### Llama-2-7b-chat-hf-q4f16_1-MLC
- **Tamaño**: ~4GB  
- **Memoria RAM requerida**: ~6-8GB
- **Velocidad**: Más lenta
- **Calidad**: Alta, mejor para tareas complejas
- **Recomendado para**: Usuarios con hardware potente

## Configuración de Modelos

Los modelos se configuran en `background/service-worker.js` en la constante `AVAILABLE_MODELS`.

```javascript
const AVAILABLE_MODELS = {
  'modelo-id-MLC': {
    name: 'Nombre descriptivo',
    size: 'Tamaño aproximado',
    description: 'Descripción del modelo'
  }
};
```

## Añadir Nuevos Modelos

1. Verificar que el modelo es compatible con WebLLM v0.2.46+
2. Usar el sufijo `-MLC` en el ID del modelo
3. Agregar configuración en `AVAILABLE_MODELS`
4. Probar la carga y funcionamiento
5. Actualizar documentación

## Notas Técnicas

- Los modelos se almacenan en el cache del navegador usando Cache API
- WebLLM v0.2.46+ usa MLCEngine en lugar de ChatModule
- Los modelos requieren WebGPU para aceleración por hardware
- El primer uso requiere descarga completa del modelo
- API actualizada usa formato OpenAI-compatible

## API de WebLLM v0.2.46+

### Inicialización
```javascript
import * as webllm from '@mlc-ai/web-llm';
const engine = new webllm.MLCEngine();
await engine.reload(modelId, undefined, { initProgressCallback });
```

### Generación de Texto
```javascript
const response = await engine.chat.completions.create({
  messages: [{ role: 'user', content: 'Prompt aquí' }],
  temperature: 0.7,
  max_tokens: 256,
  top_p: 0.9
});
const result = response.choices[0].message.content;
```

## Troubleshooting

### Modelo no carga
- Verificar que WebGPU está habilitado en `chrome://flags`
- Comprobar memoria RAM disponible
- Revisar console para errores específicos
- Verificar que el modelo ID incluye el sufijo `-MLC`

### Rendimiento lento
- Usar modelo más ligero (TinyLlama)
- Cerrar otras páginas que usen GPU
- Verificar aceleración por hardware en configuración del navegador
- Monitorear uso de memoria en DevTools

### Errores de API
- Verificar que se usa la sintaxis correcta de MLCEngine
- Comprobar que el formato de mensajes es OpenAI-compatible
- Revisar que max_tokens no excede el límite del modelo 