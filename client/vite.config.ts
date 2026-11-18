import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const target = (envVar: string, fallback: string) =>
  process.env[envVar] || fallback

const proxy = {
  '/api/auth': {
    target: target('AUTH_PROXY_TARGET', 'http://localhost:3001'),
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
  '/api/inventory': {
    target: target('INVENTORY_PROXY_TARGET', 'http://localhost:3002'),
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
  '/api/orders': {
    target: target('ORDER_PROXY_TARGET', 'http://localhost:3003'),
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
  '/api/notifications': {
    target: target('NOTIFICATION_PROXY_TARGET', 'http://localhost:3004'),
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

const allowedHosts = [
  'incidents-results-prescribed-saint.trycloudflare.com',
  '.trycloudflare.com',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts,
    proxy,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts,
    proxy,
  },
})
