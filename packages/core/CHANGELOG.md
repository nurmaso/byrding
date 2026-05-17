# @byrding/core

## 0.7.0

### Minor Changes

- Add watchState() — vanilla-JS utility for observing individual state keys with getter/setter/unwatch handle.

## 0.6.1

### Patch Changes

- Configure vitest test runner across all packages with shared base config, framework-appropriate environments, and passing smoke tests per package.
- Preserve storeRegistry across Vite HMR reloads using import.meta.hot.data, so store state, subscriptions, and action bindings survive hot module replacement in development. No runtime change in production.

## 0.6.0

### Minor Changes

- feat(core): split StoreInstance into typed TState/TActions generics

  - Exports `StateOf<T>`, `ActionsOf<T>`, and `MergedStore<S, A, C>` type helpers
  - `StoreInstance<TState, TActions>` now carries `_raw: TState` and `_actionFns: TActions` instead of untyped Record shapes
  - `StoreHandle.getSnapshot()` returns `StateOf<T>` (state only) instead of `Partial<T>` (mixed state + actions)
  - `createStore` gains two typed overloads — class constructor infers `StateOf<InstanceType<C>> & ActionsOf<InstanceType<C>>`; factory infers the return type directly; union overload preserved for framework adapters
  - Zero runtime behaviour changes — type layer only

## 0.5.0

### Minor Changes

- feat: per-store plugin support in store definitions

  - Class-style stores can declare `static plugins = [myPlugin()]` on the class constructor
  - Closure-style stores can include a `plugins: [myPlugin()]` key on the returned object (removed before classify so it is never treated as reactive state)
  - Per-store plugins run after global CoreStore plugins for every hook: `onInit`, `onStateChange`, `onAction`
  - Adds `_localPlugins: Plugin[]` to `StoreInstance`

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
