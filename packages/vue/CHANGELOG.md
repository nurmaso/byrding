# @byrding/vue

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
