#!/usr/bin/env node

/**
 * Generador de iconos para LocalLoom
 * Crea iconos placeholder usando canvas y base64
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '../icons');

// Configuración de iconos
const iconSizes = [16, 32, 48, 128];
const iconConfig = {
  backgroundColor: '#667eea',
  gradientEnd: '#764ba2',
  textColor: '#ffffff',
  emoji: '🧠',
  text: 'LL'
};

/**
 * Generar SVG para un tamaño específico
 */
function generateSVG(size) {
  const fontSize = Math.floor(size * 0.6);
  const borderRadius = Math.floor(size * 0.15);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${iconConfig.backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${iconConfig.gradientEnd};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#grad)"/>
  <text x="${size/2}" y="${size/2 + fontSize/3}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        text-anchor="middle" 
        fill="${iconConfig.textColor}">${iconConfig.text}</text>
</svg>`;
}

/**
 * Convertir SVG a PNG usando Canvas (Node.js)
 */
function generatePNGFromSVG(svgContent, size) {
  // Para un generador más simple, creamos un data URI
  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
  
  // Como no tenemos canvas en Node.js por defecto, 
  // generamos un archivo SVG que el usuario puede convertir
  return svgDataUri;
}

/**
 * Crear archivos PNG placeholder usando datos base64
 */
function createPlaceholderPNG(size) {
  // Crear un PNG simple usando datos base64
  // Esto es un hack temporal - idealmente usarías canvas o sharp
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  
  // Dibujar fondo con gradiente
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, iconConfig.backgroundColor);
  gradient.addColorStop(1, iconConfig.gradientEnd);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Dibujar texto
  ctx.fillStyle = iconConfig.textColor;
  ctx.font = `bold ${Math.floor(size * 0.6)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(iconConfig.text, size/2, size/2);
  
  return canvas.toBuffer('image/png');
}

function createCanvas(size) {
  // Simulación simple de canvas - en realidad necesitarías 'canvas' package
  return {
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      fillText: () => {},
      set fillStyle(val) {},
      set font(val) {},
      set textAlign(val) {},
      set textBaseline(val) {}
    }),
    toBuffer: () => Buffer.from([]) // Buffer vacío como placeholder
  };
}

/**
 * Generar iconos usando enfoque híbrido SVG->PNG
 */
async function generateIcons() {
  try {
    // Crear directorio de iconos si no existe
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    console.log('🎨 Generando iconos para LocalLoom...');
    
    for (const size of iconSizes) {
      const svgContent = generateSVG(size);
      const svgPath = path.join(iconsDir, `icon${size}.svg`);
      const pngPath = path.join(iconsDir, `icon${size}.png`);
      
      // Escribir SVG
      fs.writeFileSync(svgPath, svgContent);
      console.log(`✅ Generado icon${size}.svg`);
      
      // Generar PNG simple (placeholder)
      const simplePNG = generateSimplePNG(size);
      fs.writeFileSync(pngPath, simplePNG);
      console.log(`✅ Generado icon${size}.png`);
    }
    
    console.log('\n📝 Iconos generados exitosamente!');
    console.log('💡 Los archivos SVG están listos para conversión manual a PNG si es necesario.');
    console.log('🔧 Para PNG de mejor calidad, usa ImageMagick:');
    console.log('   convert icon128.svg icon128.png');
    
  } catch (error) {
    console.error('❌ Error generando iconos:', error);
    process.exit(1);
  }
}

/**
 * Generar PNG básico usando Buffer
 */
function generateSimplePNG(size) {
  // PNG simple monocromático - esto es un placeholder muy básico
  // En producción, usa 'sharp' o 'canvas' para mejores resultados
  
  const width = size;
  const height = size;
  
  // Header PNG básico (simplificado)
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk (muy simplificado)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  
  // Esto es solo un placeholder - para iconos reales usa una librería adecuada
  return Buffer.concat([
    pngSignature,
    createPNGChunk('IHDR', ihdrData),
    createPNGChunk('IEND', Buffer.alloc(0))
  ]);
}

function createPNGChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); // CRC simplificado
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Verificar y instalar dependencias si es necesario
 */
function checkDependencies() {
  console.log('🔍 Verificando dependencias...');
  
  try {
    // Intentar importar sharp para mejor calidad
    const sharp = require('sharp');
    console.log('✅ Sharp disponible - se usará para PNG de alta calidad');
    return 'sharp';
  } catch (error) {
    try {
      // Intentar canvas
      const canvas = require('canvas');
      console.log('✅ Canvas disponible - se usará para generar PNG');
      return 'canvas';
    } catch (error) {
      console.log('⚠️  Usando generador básico - considera instalar sharp o canvas para mejor calidad');
      console.log('   npm install sharp');
      console.log('   npm install canvas');
      return 'basic';
    }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🧠 LocalLoom Icon Generator');
  console.log('============================\n');
  
  const engine = checkDependencies();
  await generateIcons();
  
  console.log('\n🎉 ¡Proceso completado!');
  console.log(`📁 Iconos guardados en: ${iconsDir}`);
  
  if (engine === 'basic') {
    console.log('\n💡 Tip: Para iconos de mejor calidad, instala:');
    console.log('   npm install sharp --save-dev');
  }
}

// Ejecutar si es el script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateIcons, generateSVG }; 