# @byrding/react

## 0.4.2

### Patch Changes

- 7c3c093: Add `$reset()` method to every store instance. Calling `store.$reset()` restores all state keys to their initial values in a single operation, only notifying subscribers for keys that actually changed. Both class and closure definition styles are supported.
- Updated dependencies [66d904c]
- Updated dependencies [c13fc01]
- Updated dependencies [76d814c]
- Updated dependencies [7c3c093]
  - @byrding/core@0.10.0

## 0.4.1

### Patch Changes

- Updated dependencies
  - @byrding/core@0.9.0

## 0.4.0

### Minor Changes

- de2aeb4: Add `renderStore()` helper to `@byrding/react/testing` sub-path. Wraps RTL's `renderHook` with `act()` to eliminate boilerplate when testing store-backed hooks.

### Patch Changes

- 5839498: Consolidate ImportMeta.hot augmentation into core to fix TS2717 conflict between data and accept declarations.
- 5dca789: Add Vite HMR self-accept handler to defineStore so Fast Refresh reloads don't bubble to the app root. State preservation is handled by the core registry hot.data fix.
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

- cbce942: Remove process.env.NODE_ENV guard from inferComponentName — process is not available in all browser build environments without @types/node. Stack-based name inference is lightweight and the try/catch already handles failures gracefully.
- Updated dependencies [7290074]
  - @byrding/core@0.1.1

## 0.1.0

### Minor Changes

- Initial implementation of @byrding/react
