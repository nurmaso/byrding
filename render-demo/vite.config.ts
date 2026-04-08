import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  resolve: {
    // Follow pnpm symlinks for workspace packages
    preserveSymlinks: true,
  },
  optimizeDeps: {
    // Pre-bundle workspace TypeScript packages so Vite handles them correctly
    include: ['@bocal/core', '@bocal/react'],
    esbuildOptions: {
      // Workspace packages expose raw .ts source — esbuild handles these
      loader: { '.ts': 'ts' },
    },
  },
})
