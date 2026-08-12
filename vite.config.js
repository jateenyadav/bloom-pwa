import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative base so the built app works on Vercel/Netlify AND from a
  // GitHub Pages subpath without further configuration.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bloom',
        short_name: 'Bloom',
        description: 'A small daily dose of joy, and a calm place to breathe.',
        theme_color: '#f7f3ee',
        background_color: '#f7f3ee',
        display: 'standalone',
        orientation: 'portrait',
        // Relative scope/start_url keep the app installable from a subpath.
        scope: './',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the whole (small) app shell so it works offline after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2,json,mp3}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Lets us verify install/offline behaviour with `npm run dev` too.
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
