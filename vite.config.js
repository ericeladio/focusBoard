import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { apiDev } from './scripts/dev-api.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // /api/* en local contra el mismo Neon y R2 que producción (solo en serve).
    apiDev(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Focus',
        short_name: 'Focus',
        description: 'Focus: siete cosas, nada más.',
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
        // Sin esto el SW viejo sigue mandando hasta que el usuario cierre
        // todas las pestañas: el código nuevo tarda en llegar.
        skipWaiting: true,
        clientsClaim: true,
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
