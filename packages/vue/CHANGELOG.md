# @byrding/vue

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
