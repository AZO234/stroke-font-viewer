import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_URL は GitHub Pages / GitLab Pages のリポジトリ名に合わせて
// 環境変数 VITE_BASE で上書き可能。例: /stroke-editor/
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon512.png', 'icon.svg'],
      manifest: false,
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(strokes|kanjivg).*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stroke-data',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
})
