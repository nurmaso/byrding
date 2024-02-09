import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), vue()],
  resolve: {
    alias: {
      '@byrding/core':  resolve(__dirname, '../packages/core/src/index.ts'),
      '@byrding/react': resolve(__dirname, '../packages/react/src/index.ts'),
      '@byrding/vue':   resolve(__dirname, '../packages/vue/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: 80,
  },
})
