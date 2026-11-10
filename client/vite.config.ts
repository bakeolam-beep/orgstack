import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'incidents-results-prescribed-saint.trycloudflare.com',
      '.trycloudflare.com',
    ],
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/inventory': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/inventory/, ''),
      },
      '/api/orders': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/orders/, ''),
      },
      '/api/notifications': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notifications/, ''),
      },
    },
  },
})
