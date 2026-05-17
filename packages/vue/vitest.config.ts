import { defineConfig, mergeConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { resolve } from 'path'
import base from '../../vitest.config.base'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default mergeConfig(base, defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@byrding/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
}))
