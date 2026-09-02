import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifestFilename: 'manifest.json',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['index.html', 'assets/index-*.css', 'assets/image/Logo-*.png'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'zenith-static-v1',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'zenith-images-v1',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ],
      },
      manifest: {
        id: '/',
        name: 'Zenith - Sua precisão agrícola no ponto mais alto',
        short_name: 'Zenith',
        lang: 'pt-BR',
        description: 'Plataforma para acompanhar a lavoura e tomar decisões mais seguras.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        categories: ['business', 'productivity'],
        theme_color: '#245f3b',
        background_color: '#f4f8ef',
        icons: [
          {
            src: '/assets/image/Logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/image/Logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },

      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },

  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true
  }
})
