# @byrding/vue

## 0.4.0

### Minor Changes

- 35d2d50: Ship CommonJS alongside ESM. All three packages are now built with tsup and publish `dist/index.js` (ESM), `dist/index.cjs` (CJS), and declarations for both (`.d.ts` / `.d.cts`); `@byrding/core/testing` and `@byrding/react/testing` get the same treatment. Every `exports` entry carries nested `import` and `require` conditions, each with `types` first, so Jest without ESM configuration, CJS test runners, and CJS server paths can `require()` the packages. `main` now points at the CJS build and `module` at ESM.

  Packaging hygiene in the same change: `"sideEffects": false` (verified with esbuild production bundles — an unused import of an adapter is eliminated entirely, and a used one keeps the registry and duplicate-copy guard intact), `"engines": { "node": ">=18" }`, and npm `keywords` on all three packages. `@byrding/react` declares `@testing-library/react` as an optional peer dependency, which the `./testing` entry always required but never declared. Test files under `src/__tests__` are no longer shipped in the npm tarballs or to JSR.

  Repo-only: `pnpm smoke` runs ESM and CJS consumption tests against the built artifacts, and `@byrding/plugin-persist`'s tests now resolve `@byrding/core` from source so they pass on a clean checkout without building core first.

### Patch Changes

- 9f6e6db: `@byrding/react` / `@byrding/vue`: depend on `@byrding/core` with a caret range instead of an exact pin. The adapters declared `workspace:*`, which pnpm rewrites to the exact core version at publish (`"0.10.0"`); it is now `workspace:^` (`"^0.10.0"`). With an exact pin, upgrading one adapter but not the other installed two copies of core — and therefore two store registries — which silently broke cross-framework sharing. The JSR manifests get the same treatment: their `@byrding/core` import was pinned to `^0.0.1` (unresolvable against current core) and is now synced to a caret range on the released core version at publish time.

  `@byrding/core`: add a development-only duplicate-instance guard. On first initialisation core stamps `globalThis` under `Symbol.for('byrding.core.instance')`; if a second copy of core initialises afterwards it warns once, naming both versions and explaining that two copies mean two registries. Vite HMR re-evaluation of the same copy is recognised via `import.meta.hot.data` and stays silent. No-op in production.

- Updated dependencies [99900af]
- Updated dependencies [35d2d50]
- Updated dependencies [00f424f]
- Updated dependencies [69c931f]
- Updated dependencies [02639e6]
- Updated dependencies [c7e3deb]
- Updated dependencies [9f6e6db]
- Updated dependencies [de6074f]
- Updated dependencies [3b1143f]
  - @byrding/core@0.11.0

## 0.3.3

### Patch Changes

- 7c3c093: Add `$reset()` method to every store instance. Calling `store.$reset()` restores all state keys to their initial values in a single operation, only notifying subscribers for keys that actually changed. Both class and closure definition styles are supported.
- Updated dependencies [66d904c]
- Updated dependencies [c13fc01]
- Updated dependencies [76d814c]
- Updated dependencies [7c3c093]
  - @byrding/core@0.10.0

## 0.3.2

### Patch Changes

- Updated dependencies
  - @byrding/core@0.9.0

## 0.3.1

### Patch Changes

- 5839498: Consolidate ImportMeta.hot augmentation into core to fix TS2717 conflict between data and accept declarations.
- a51ae37: Add Vite HMR self-accept handler so the defineStore module self-accepts hot reloads instead of propagating them to the app root. The shallowReactive in useStore() re-syncs automatically on the next composable call because createStore returns the preserved instance from the core registry.
- Updated dependencies [1344dab]
- Updated dependencies [26c6a58]
- Updated dependencies [5839498]
- Updated dependencies [4035ce0]
  - @byrding/core@0.8.0

## 0.3.0

### Minor Changes

- Thread `MergedStore<StateOf<T>, ActionsOf<T>>` generics through `defineStore` in both React and Vue adapters.

  - `defineStore` now has class and closure overloads so the hook/composable return type is fully inferred
  - Hook/composable returns `MergedStore<StateOf<T>, ActionsOf<T>>` — state properties typed exactly, action signatures preserved, no opaque `T`
  - Zero runtime behaviour changes — type layer only

## 0.2.3

### Patch Changes

- Configure vitest test runner across all packages with shared base config, framework-appropriate environments, and passing smoke tests per package.
- Updated dependencies
  - @byrding/core@0.6.1

## 0.2.2

### Patch Changes

- Updated dependencies
  - @byrding/core@0.6.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @byrding/core@0.5.0

## 0.2.0

### Minor Changes

- `defineStore` accepts an optional `options` third argument `{ core?: CoreStore }` and forwards it to `createStore`. Allows micro-frontends and isolated app sections to use their own plugin context without touching the global singleton. Rename local `coreStore` variable → `storeHandle` to avoid shadowing the imported class.

### Patch Changes

- Updated dependencies
  - @byrding/core@0.4.0

## 0.1.4

### Patch Changes

- Migrate devtools to an opt-in `devtoolsPlugin()` using the Plugin interface. Add `CoreStore` singleton, `coreStore`, and `configureByrding()` for global plugin registration. Remove auto-installed devtools hook — wire via `configureByrding({ plugins: [devtoolsPlugin()] })` to opt in. Rename internal `CoreStore<T>` interface to `StoreHandle<T>`.
- Updated dependencies
  - @byrding/core@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies
  - @byrding/core@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @byrding/core@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [7290074]
  - @byrding/core@0.1.1

## 0.1.0

### Minor Changes

- Initial implementation of @byrding/vue
