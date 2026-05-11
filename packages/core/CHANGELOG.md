# @byrding/core

## 0.4.0

### Minor Changes

- `createStore` accepts optional `{ core?: CoreStore }` third argument — when provided, only that CoreStore instance's plugins run; the global singleton is bypassed for that store. Both `@byrding/react` and `@byrding/vue` `defineStore` forward the same `options`. Renames the internal `CoreStore<T>` return-type interface to `StoreHandle<T>` to avoid the class/interface naming collision.

## 0.3.0

### Minor Changes

- Migrate devtools to an opt-in `devtoolsPlugin()` using the Plugin interface. Add `CoreStore` singleton, `coreStore`, and `configureByrding()` for global plugin registration. Remove auto-installed devtools hook — wire via `configureByrding({ plugins: [devtoolsPlugin()] })` to opt in. Rename internal `CoreStore<T>` interface to `StoreHandle<T>`.

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

## 0.1.0

### Minor Changes

- Initial implementation of @byrding/core
