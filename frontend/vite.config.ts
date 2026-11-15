import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'] // Prevents Vite from "pre-bundling" and breaking it
  },
  server: {
    // 'host: true' allows your phone to find the site via your IP
    host: true,
    // If 'true' gives a TS error, use an empty object {} 
    // This satisfies the 'ServerOptions' requirement
    https: {},
    port: 5173,
    proxy: {
      '/predict': 'http://127.0.0.1:8000',
      '/gradcam': 'http://127.0.0.1:8000',
      '/gradcam-heatmap-only': 'http://127.0.0.1:8000',
      '/clinical-report': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  }
})