import { defineConfig, mergeConfig } from 'vitest/config'
import base from '../../vitest.config.base'

export default mergeConfig(base, defineConfig({
  test: {
    environment: 'node',
    // Run the *.test-d.ts type assertions.  The package tsconfig excludes
    // __tests__ (so the build never compiles them), which would make the
    // typecheck pass vacuously — point it at a config that includes them.
    typecheck: { enabled: true, tsconfig: './tsconfig.test.json' },
  },
}))
