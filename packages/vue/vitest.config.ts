import { defineConfig, mergeConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { resolve } from 'path'
import base from '../../vitest.config.base'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default mergeConfig(base, defineConfig({
  test: {
    environment: 'jsdom',
    // Run the *.test-d.ts type assertions.  The package tsconfig excludes
    // __tests__ (so the build never compiles them), which would make the
    // typecheck pass vacuously — point it at a config that includes them.
    typecheck: { enabled: true, tsconfig: './tsconfig.test.json' },
  },
  resolve: {
    alias: {
      '@byrding/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
}))
