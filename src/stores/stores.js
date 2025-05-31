import { writable } from 'svelte/store';

// Store para el estado del modelo LLM
export const llmStore = writable({
  loaded: false,
  loading: false,
  modelName: null,
  error: null
});

// Store para el texto seleccionado
export const selectedTextStore = writable('');

// Store para la respuesta del LLM
export const responseStore = writable('');

// Store para configuraciones de usuario
export const settingsStore = writable({
  defaultTask: 'summarize',
  autoSave: true,
  theme: 'light'
});

// Store para el historial de resultados
export const historyStore = writable([]); 