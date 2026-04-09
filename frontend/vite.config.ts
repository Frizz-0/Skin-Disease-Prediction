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
  }
})