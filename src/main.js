import { createApp } from 'vue'
import './theme/tokens.css'
import App from './App.vue'

// Service Worker: force update bei Version-Wechsel
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const base = import.meta.env.BASE_URL || '/'
    try {
      const reg = await navigator.serviceWorker.register(`${base}service-worker.js`)
      // Sofort neue SW-Version aktivieren falls wartend
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              window.location.reload()
            }
          })
        }
      })
    } catch (_) { /* SW nicht verfügbar */ }
  })
}

createApp(App).mount('#app')
