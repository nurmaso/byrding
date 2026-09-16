---
"@byrding/core": minor
"@byrding/react": minor
"@byrding/vue": minor
---

Ship CommonJS alongside ESM. All three packages are now built with tsup and publish `dist/index.js` (ESM), `dist/index.cjs` (CJS), and declarations for both (`.d.ts` / `.d.cts`); `@byrding/core/testing` and `@byrding/react/testing` get the same treatment. Every `exports` entry carries nested `import` and `require` conditions, each with `types` first, so Jest without ESM configuration, CJS test runners, and CJS server paths can `require()` the packages. `main` now points at the CJS build and `module` at ESM.

Packaging hygiene in the same change: `"sideEffects": false` (verified with esbuild production bundles — an unused import of an adapter is eliminated entirely, and a used one keeps the registry and duplicate-copy guard intact), `"engines": { "node": ">=18" }`, and npm `keywords` on all three packages. `@byrding/react` declares `@testing-library/react` as an optional peer dependency, which the `./testing` entry always required but never declared. Test files under `src/__tests__` are no longer shipped in the npm tarballs or to JSR.

Repo-only: `pnpm smoke` runs ESM and CJS consumption tests against the built artifacts, and `@byrding/plugin-persist`'s tests now resolve `@byrding/core` from source so they pass on a clean checkout without building core first.
