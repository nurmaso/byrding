# @byrding/react

## 0.3.0

### Minor Changes

- Add per-store plugin support: pass `plugins` in `defineStore` options or as a `static plugins` class property. Per-store plugins run after global plugins for every lifecycle hook.

### Patch Changes

- Updated dependencies
  - @byrding/core@0.5.0

## 0.2.0

### Minor Changes

- Export `CoreStore` class for multi-core isolation; add optional `{ core }` option to `defineStore` in React and Vue adapters. Rename internal `CoreStore<T>` interface to `StoreHandle<T>` to resolve naming conflict.

### Patch Changes

- Updated dependencies
  - @byrding/core@0.4.0

## 0.1.4

### Patch Changes

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
