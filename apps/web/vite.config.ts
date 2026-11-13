import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  plugins: [
    react(),
    tailwindcss(),
    // Precaches the app shell so repeat visits load instantly and the app opens offline.
    // API responses are deliberately not cached: contacts must never be served stale.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'CRM Workspace',
        short_name: 'Contacts',
        theme_color: '#1e293b',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/health/],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/polyfills.ts', './src/test/setup.ts'],
    css: false,
    // Process nuqs through Vite so it shares the app's single copy of react-router.
    server: { deps: { inline: ['nuqs'] } },
  },
})
