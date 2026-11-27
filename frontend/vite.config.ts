import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/static/web/' : '/',
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
}))
