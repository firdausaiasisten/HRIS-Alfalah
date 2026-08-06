import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'HRIS Al-Falah',
        short_name: 'HRIS Al-Falah',
        description: 'Sistem Informasi Manajemen SDM Pesantren Al-Falah',
        theme_color: '#0F766E',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Precache the built app shell; API/data calls to Supabase are
        // deliberately NOT cached here (not listed in globPatterns, so
        // Workbox never touches them) -- HR data must never be served
        // stale from a service-worker cache, same principle the original
        // hand-rolled sw.js followed for its Supabase fetch() calls.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Google Fonts are cross-origin, so globPatterns (which only
        // covers local build output) never touches them -- without this,
        // the branded Inter/Philosopher fonts would silently fall back to
        // system fonts whenever offline. Mirrors the original hand-rolled
        // sw.js, which explicitly cached the same Google Fonts stylesheet
        // URL for the same reason.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
})
