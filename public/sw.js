const CACHE_NAME = "zenith-cache-v3"

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json?v=20260826",
  "/assets/image/Logo.png?v=20260826"
]

self.addEventListener("install", (event) => {
  console.log("Service Worker instalado")

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).then(() => self.skipWaiting())
    })
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  )
})
