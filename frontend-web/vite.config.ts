import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'vendor-react'
          }
          if (
            id.includes('/antd/') ||
            id.includes('/@ant-design/') ||
            id.includes('/rc-')
          ) {
            return 'vendor-ui'
          }
          if (
            id.includes('/three/') ||
            id.includes('/three-stdlib/') ||
            id.includes('/@react-three/') ||
            id.includes('/draco3d/') ||
            id.includes('/meshoptimizer/')
          ) {
            return 'vendor-three'
          }
          if (id.includes('/@tanstack/') || id.includes('/axios/')) {
            return 'vendor-data'
          }
          if (id.includes('/dayjs/')) {
            return 'vendor-date'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/theme-editor': {
        target: 'http://localhost:5180',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
