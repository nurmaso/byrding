import { defineConfig } from 'tsup'

// ESM + CJS + declarations for both.  `splitting: false` keeps the output to
// one file per entry (no shared chunk); the only module shared between the
// two entries is the pure `classify.ts`, so duplicating it is harmless and
// the registry singleton lives in `index` alone.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2020',
  splitting: false,
  clean: true,
  esbuildOptions(options) {
    // `registry.ts` reads `import.meta.hot` for Vite HMR.  In the CJS output
    // `import.meta` is `{}`, so `.hot` is `undefined` — the same code path as
    // a production build.  Expected; silence esbuild's per-build warning.
    options.logOverride = { 'empty-import-meta': 'silent' }
  },
})
