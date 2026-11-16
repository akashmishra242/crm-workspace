import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

/**
 * Libraries that change rarely get their own long-cached chunks, so shipping an app change
 * only re-downloads the app's own code. Libraries used only by lazy screens (the calendar,
 * for one) are left out and travel with those screens.
 */
const VENDOR_CHUNKS: Record<string, RegExp> = {
  react: /node_modules\/(react|react-dom|scheduler|react-router)\//,
  query:
    /node_modules\/@tanstack\/(query-core|react-query|query-persist|react-query-persist|query-async|react-virtual|virtual-core)/,
  ui: /node_modules\/(radix-ui|@radix-ui|cmdk|sonner|@floating-ui)\//,
  dnd: /node_modules\/@dnd-kit\//,
  forms: /node_modules\/(react-hook-form|@hookform|zod|libphonenumber-js)\//,
}

function vendorChunk(id: string): string | undefined {
  const normalized = id.replaceAll('\\', '/')
  return Object.entries(VENDOR_CHUNKS).find(([, pattern]) => pattern.test(normalized))?.[0]
}

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
      // "prompt": a new version waits until lib/appUpdate.ts decides it's safe to switch.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'CRM Workspace',
        short_name: 'Contacts',
        theme_color: '#1e293b',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/health/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
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
    // Whole-page tests take about a second; the extra room is for a busy CI machine.
    testTimeout: 15_000,
    // Process nuqs through Vite so it shares the app's single copy of react-router.
    server: { deps: { inline: ['nuqs'] } },
  },
})
