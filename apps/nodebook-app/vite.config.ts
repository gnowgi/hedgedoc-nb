import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'nodeBook',
        short_name: 'nodeBook',
        description: 'CNL knowledge graph editor',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\./,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined
  },
  resolve: {
    alias: {
      // Use the bundled (non-worker) version of elkjs for cross-browser compatibility.
      // The default entry uses web workers + Node worker_threads which fail in Firefox.
      'elkjs/lib/elk-api': 'elkjs/lib/elk.bundled.js',
      // Shim readline-sync (used by tau-prolog for Node REPL TTY input).
      // Its top-level code accesses Node APIs (process.binding, fs, child_process)
      // that crash in non-Chromium browsers.
      'readline-sync': path.resolve(__dirname, 'src/readline-sync-shim.ts')
    }
  },
  css: {
    modules: { localsConvention: 'camelCase' }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    target: ['es2022', 'firefox115', 'safari16']
  }
})
