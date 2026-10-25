import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'cyclone-logo.png', 'icons.svg'],
      manifest: {
        name: 'CycloSafe — Citizen & Coastal Safety',
        short_name: 'CycloSafe',
        description: 'AI-Powered Coastal Safety & Cyclone Monitoring for Citizens and Fishermen',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/citizen',
        icons: [
          {
            src: '/cyclone-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/cyclone-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Cache Google Fonts or unpkg icons/styles
            urlPattern: /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
