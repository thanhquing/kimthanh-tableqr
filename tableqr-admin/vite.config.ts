import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const apiProxy = {
  '/api': 'http://localhost:3000',
  '/menu-images': 'http://localhost:3000',
  '/uploads': 'http://localhost:3000',
}

export default defineConfig(({ mode }) => ({
  publicDir: loadEnv(mode, process.cwd(), '').VITE_USE_MOCK === 'true' ? 'public' : false,
  plugins: [react(), tailwindcss()],
  server: { port: 5175, proxy: apiProxy, strictPort: true },
  preview: { port: 5175, proxy: apiProxy, strictPort: true },
}))
