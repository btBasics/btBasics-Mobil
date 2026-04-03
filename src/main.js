import { createApp } from 'vue'
import './theme/tokens.css'
import App from './App.vue'

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker.register(`${base}service-worker.js`).catch(() => {})
  })
}

createApp(App).mount('#app')
