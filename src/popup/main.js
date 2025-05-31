import App from './App.svelte';

// Inicializar la aplicación Svelte
const app = new App({
  target: document.getElementById('app'),
  props: {
    // Props iniciales si son necesarias
  }
});

// Manejar errores globales
window.addEventListener('error', (event) => {
  console.error('Error global en LocalLoom popup:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada no manejada en LocalLoom popup:', event.reason);
});

console.log('LocalLoom popup iniciado');

export default app; 