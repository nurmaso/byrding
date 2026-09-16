import { defineConfig, mergeConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { resolve } from 'path'
import base from '../../vitest.config.base'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default mergeConfig(base, defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      // Test against core's source, as react and vue do, so the suite passes
      // on a clean checkout without building core first.
      '@byrding/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
}))
