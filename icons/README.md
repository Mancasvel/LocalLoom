# Iconos para LocalLoom

Esta carpeta debe contener los iconos de la extensión en diferentes tamaños.

## Iconos Requeridos

- `icon16.png` - 16x16px (aparece en la toolbar)
- `icon32.png` - 32x32px (Windows)
- `icon48.png` - 48x48px (página de extensiones)
- `icon128.png` - 128x128px (Chrome Web Store)

## Especificaciones

- **Formato**: PNG con transparencia
- **Estilo**: Moderno, simple, reconocible
- **Colores**: Debe funcionar bien en modo claro y oscuro
- **Tema**: Cerebro/AI/procesamiento de texto

## Sugerencias de Diseño

- Icono de cerebro estilizado
- Combinación de cerebro + texto/documento
- Colores: Azul (#3b82f6) y tonos neutros
- Bordes redondeados para estética moderna

## Herramientas Recomendadas

- [Favicon.io](https://favicon.io/) - Generador online
- [Icons8](https://icons8.com/) - Biblioteca de iconos
- Figma/Adobe Illustrator para diseño personalizado

## Crear Iconos Temporales

Mientras no tengas iconos personalizados, puedes usar estos recursos:

1. Crear iconos de placeholder usando emoji 🧠
2. Usar generadores online con texto "LL"
3. Adaptar iconos open source compatibles con la licencia

## Formato del Archivo

Los iconos deben ser referenciados en `manifest.json`:

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png", 
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
``` 