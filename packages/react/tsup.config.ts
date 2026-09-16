import { defineConfig } from 'tsup'

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
  // `dependencies` and `peerDependencies` are externalised automatically.
  // `@testing-library/react` is only used by the `./testing` entry and is an
  // optional peer — never bundle it into dist.
  external: ['@testing-library/react'],
  esbuildOptions(options) {
    // `defineStore.ts` self-accepts `import.meta.hot` for Vite HMR.  In the
    // CJS output `import.meta` is `{}` and the branch is skipped, exactly as
    // in a production build.  Expected; silence esbuild's warning.
    options.logOverride = { 'empty-import-meta': 'silent' }
  },
})
