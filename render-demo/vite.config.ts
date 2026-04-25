import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  optimizeDeps: {
    // Pre-bundle workspace TypeScript packages so Vite handles them correctly
    include: ['@byrding/core', '@byrding/react'],
    esbuildOptions: {
      // Workspace packages expose raw .ts source — esbuild handles these
      loader: { '.ts': 'ts' },
    },
  },
})
