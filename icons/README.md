# Iconos de LocalLoom

Esta carpeta contiene los iconos necesarios para la extensión LocalLoom en diferentes tamaños.

## Iconos Requeridos

La extensión necesita los siguientes archivos de iconos:

- `icon16.png` - 16x16 píxeles (barra de herramientas)
- `icon32.png` - 32x32 píxeles (gestión de extensiones)
- `icon48.png` - 48x48 píxeles (página de extensiones)
- `icon128.png` - 128x128 píxeles (Chrome Web Store)

## Generación de Iconos

### Opción 1: Usar emojis como iconos temporales

Para pruebas rápidas, puedes usar este script para generar iconos básicos:

```bash
# Instalar ImageMagick si no lo tienes
# Ubuntu/Debian: sudo apt install imagemagick
# macOS: brew install imagemagick
# Windows: https://imagemagick.org/script/download.php#windows

# Generar iconos básicos con emoji
convert -background transparent -fill "#667eea" -font "Arial" -pointsize 12 -gravity center label:"🧠" icon16.png
convert -background transparent -fill "#667eea" -font "Arial" -pointsize 24 -gravity center label:"🧠" icon32.png
convert -background transparent -fill "#667eea" -font "Arial" -pointsize 36 -gravity center label:"🧠" icon48.png
convert -background transparent -fill "#667eea" -font "Arial" -pointsize 96 -gravity center label:"🧠" icon128.png
```

### Opción 2: Crear iconos personalizados

Puedes crear iconos personalizados usando cualquier editor gráfico:

1. **Diseño recomendado:**
   - Fondo: Gradiente de #667eea a #764ba2
   - Icono: Cerebro estilizado o "LL" en blanco
   - Esquinas redondeadas
   - Sombra sutil

2. **Herramientas sugeridas:**
   - Figma (gratis, web)
   - GIMP (gratis)
   - Adobe Illustrator/Photoshop
   - Canva

3. **Exportar en PNG con transparencia**

### Opción 3: Usar iconos placeholder

Para desarrollo inmediato, puedes usar estos archivos SVG convertidos a PNG:

```html
<!-- SVG base para generar PNG -->
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" fill="url(#grad)"/>
  <text x="64" y="80" font-family="Arial" font-size="64" text-anchor="middle" fill="white">🧠</text>
</svg>
```

## Instalación Rápida

Si necesitas iconos funcionales inmediatamente, ejecuta:

```bash
# Crear iconos básicos usando datos base64
npm run generate-icons
```

## Especificaciones Técnicas

- **Formato:** PNG con transparencia
- **Calidad:** Alta resolución, optimizado para diferentes DPI
- **Colores:** Consistentes con la marca LocalLoom
- **Estilo:** Moderno, minimalista, profesional

## Notas

- Los iconos deben ser cuadrados (1:1 ratio)
- Usar transparencia en lugar de fondo blanco
- Optimizar para tamaño de archivo pequeño
- Probar visibilidad en temas claro y oscuro

Para una experiencia completa, reemplaza estos iconos placeholder con diseños profesionales antes del lanzamiento.

## Sugerencias de Diseño

- Icono de cerebro estilizado
- Combinación de cerebro + texto/documento
- Colores: Azul (#3b82f6) y tonos neutros
- Bordes redondeados para estética moderna

## Herramientas Recomendadas

- [Favicon.io](https://favicon.io/) - Generador online
- [Icons8](https://icons8.com/) - Biblioteca de iconos
- Figma/Adobe Illustrator para diseño personalizado

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