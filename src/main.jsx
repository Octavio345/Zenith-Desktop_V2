import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

const LEGACY_CACHE_NAMES = ["agrovoo-cache-v1"]

// Mantem a PWA atualizada e remove o cache criado pelo Service Worker antigo.
if ("serviceWorker" in navigator) {
  let refreshing = false

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener("load", () => {
    if ("caches" in window) {
      Promise.all(LEGACY_CACHE_NAMES.map((cacheName) => caches.delete(cacheName)))
        .catch(() => undefined)
    }

    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => undefined)
      })
      .catch((err) => {
        console.log("Erro ao registrar SW:", err)
      })
  })
}
