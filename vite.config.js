import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Vision Board',
        short_name: 'Vision Board',
        description: 'Vision board: siete cosas, nada más.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#e7e4d6',
        theme_color: '#e7e4d6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          // Fotos del muro servidas por el proxy de R2 (claves sin extensión).
          {
            urlPattern: /\/api\/images\//,
            method: 'GET',
            handler: 'CacheFirst',
            options: {
              cacheName: 'goal-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 90 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Subidas de foto: si no hay red, la cola del SW las reenvía al volver.
          {
            urlPattern: /\/api\/images\//,
            method: 'PUT',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'fb-image-uploads',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpe?g|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
