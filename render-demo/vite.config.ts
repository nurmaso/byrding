import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  optimizeDeps: {
    // Pre-bundle local TypeScript packages so Vite handles them correctly
    include: ['@bocal/core', '@bocal/react'],
    esbuildOptions: {
      // Local packages expose raw .ts source — esbuild handles these
      loader: { '.ts': 'ts' },
    },
  },
})
