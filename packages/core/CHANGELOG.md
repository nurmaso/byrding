# @byrding/core

## 0.4.0

### Minor Changes

- Export `CoreStore` class for multi-core isolation; add optional `{ core }` option to `defineStore` in React and Vue adapters. Rename internal `CoreStore<T>` interface to `StoreHandle<T>` to resolve naming conflict.

## 0.3.0

### Minor Changes

- Add global `CoreStore` singleton with plugin registry: `configureByrding({ plugins })` for one-time setup and `coreStore.use()` for dynamic registration. Plugin hooks (`onInit`, `onStateChange`, `onAction`, `onDispose`) are invoked automatically by `createStore`.

## 0.2.0

### Minor Changes

- Export `Plugin` and `PluginFactory` TypeScript interfaces — foundational type contract for the plugin system.

## 0.1.2

### Patch Changes

- Replace `declare global` Window augmentation with a local type alias to satisfy JSR's restriction on modifying global types.

## 0.1.1

### Patch Changes

- 7290074: Fix NaN when a class-style computed getter calls another computed getter via `this`.

  Class getters were bound to `_proxy`, which wraps only `_raw` (state keys). A getter calling `this.subtotal` would look up `subtotal` on `_raw`, get `undefined`, and produce NaN.

  Introduces a thin `bindTarget` proxy for class stores: a wrapper over `_proxy` that intercepts reads of computed keys and routes them through `_getterFns`, while all state reads and writes still flow through `_proxy` and its notification traps.

  Closure-style stores are unaffected — their getters reference the closure variable directly and never go through `_proxy` for computed key reads.
