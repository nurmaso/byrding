# @byrding/core

## 0.11.0

### Minor Changes

- 99900af: Add `disposeStore(id)` — a **development and test facility** that tears down a registered store so the next `createStore(id)` starts fresh from whatever definition it is given: runs the registering core's global `onDispose` hooks and the store's per-store plugin `onDispose` hooks, removes its cross-store dep edges in both directions, clears its subscriptions, and deletes the registry entry. Returns `true` when a store was disposed.

  **In production (`NODE_ENV === 'production'`) it is a no-op that returns `false`** and leaves the store untouched: stores are first-wins per id and are never replaced in live. Handles obtained before disposal are stale afterwards — this removes a store, it does not swap one in place.

  `resetRegistry()` (test-only) now disposes every registered store before clearing, so plugin `onDispose` hooks fire and dep edges are cleaned up in test teardown. `removeStoreDeps` and `CoreStore.runOnDispose`, previously never called, are now exercised by this path.

- 35d2d50: Ship CommonJS alongside ESM. All three packages are now built with tsup and publish `dist/index.js` (ESM), `dist/index.cjs` (CJS), and declarations for both (`.d.ts` / `.d.cts`); `@byrding/core/testing` and `@byrding/react/testing` get the same treatment. Every `exports` entry carries nested `import` and `require` conditions, each with `types` first, so Jest without ESM configuration, CJS test runners, and CJS server paths can `require()` the packages. `main` now points at the CJS build and `module` at ESM.

  Packaging hygiene in the same change: `"sideEffects": false` (verified with esbuild production bundles — an unused import of an adapter is eliminated entirely, and a used one keeps the registry and duplicate-copy guard intact), `"engines": { "node": ">=18" }`, and npm `keywords` on all three packages. `@byrding/react` declares `@testing-library/react` as an optional peer dependency, which the `./testing` entry always required but never declared. Test files under `src/__tests__` are no longer shipped in the npm tarballs or to JSR.

  Repo-only: `pnpm smoke` runs ESM and CJS consumption tests against the built artifacts, and `@byrding/plugin-persist`'s tests now resolve `@byrding/core` from source so they pass on a clean checkout without building core first.

- c7e3deb: Instrument each store exactly once per id. `createStore` is called once per framework adapter and again on every Vite HMR re-evaluation; previously the `_notify` wrapper, the `onAction` wrapper, and the snapshot cache were re-applied on every call, so a store used from both React and Vue was instrumented twice. Fixes four consequences of that:

  - Global (`configureByrding`) and per-store (`plugins`) `onStateChange` / `onAction` hooks fired once per handle instead of once per mutation / action.
  - `$patch` through one handle did not invalidate another handle's snapshot, so a `$patch` from Vue left React's `useSyncExternalStore` holding a stale reference and the component did not re-render.
  - Cross-store propagation (`_propagate` in `subscriptions.ts`) bypassed the snapshot-cache invalidation, so a React component reading only computed values derived from another store via `useStore()` never re-rendered when the upstream changed.
  - Action references differed between handles, contradicting the documented stable-reference guarantee.

  The snapshot cache and the registering `CoreStore` now live on `StoreInstance` (`_snapshotCache`, `_core`) so all handles share them. A later `createStore` call for an already-registered id that resolves a different `options.core` now warns once in development (first registration wins; the warning is a no-op when `NODE_ENV === 'production'`).

  New exports: `devWarn`, `isDev`, `resetDevWarnings` (dev-only diagnostics helper) and the `StoreCoreHooks` type. No public API changes to `createStore`, `StoreHandle`, or the framework adapters.

### Patch Changes

- 00f424f: Fix three accessor state bugs: $patch() now applies accessor keys via their setter; onInit plugin snapshot includes accessor values; accessor getters in buildMergedStore now participate in cross-store dep tracking.
- 69c931f: `@byrding/react`: `inferComponentName()` — which constructs an `Error` and parses its stack to name the calling component for devtools — was documented as development-only but ran unconditionally on every component's first render, in production bundles too. Its call site in `useStore` is now gated on a literal `process.env.NODE_ENV !== 'production'` check, so bundlers that replace `NODE_ENV` statically (Vite, webpack, esbuild) drop the function from production bundles entirely; in production the component is reported to devtools under its generated `byrding_N` id, which the event payloads already accept. Where `process` is undefined and nothing replaced it (unbundled browser usage), inference is skipped rather than throwing.

  `@byrding/core`: fix `isDev()` (introduced in the previous release) reporting _development_ inside browser production builds. Bundlers replace `process.env.NODE_ENV` but leave `typeof process` untouched, and `process` does not exist in the browser, so the `typeof process === 'undefined'` guard short-circuited to `true`. `isDev()` now reads `process.env.NODE_ENV` directly inside a try/catch and treats an unreadable value as production. `devWarn` therefore stays silent in production browser bundles as intended.

- 02639e6: `getContext().version` now reports the real package version. It was a hardcoded `'0.6.0'` literal that had fallen several releases behind. The version is baked into a generated, tracked `src/version.ts` by `scripts/generate-version.mjs`, which runs from core's `prebuild` hook and from the new root `version-packages` script (`changeset version` followed by regeneration), so both local builds and the changesets "Version Packages" commit keep it in sync. A test compares `getContext().version` against `package.json` read at test time, so any drift fails the suite.
- 9f6e6db: `@byrding/react` / `@byrding/vue`: depend on `@byrding/core` with a caret range instead of an exact pin. The adapters declared `workspace:*`, which pnpm rewrites to the exact core version at publish (`"0.10.0"`); it is now `workspace:^` (`"^0.10.0"`). With an exact pin, upgrading one adapter but not the other installed two copies of core — and therefore two store registries — which silently broke cross-framework sharing. The JSR manifests get the same treatment: their `@byrding/core` import was pinned to `^0.0.1` (unresolvable against current core) and is now synced to a caret range on the released core version at publish time.

  `@byrding/core`: add a development-only duplicate-instance guard. On first initialisation core stamps `globalThis` under `Symbol.for('byrding.core.instance')`; if a second copy of core initialises afterwards it warns once, naming both versions and explaining that two copies mean two registries. Vite HMR re-evaluation of the same copy is recognised via `import.meta.hot.data` and stays silent. No-op in production.

- de6074f: Refactor closure-style accessor notification path to be symmetric with class style: extract `wrappedSet` and share it between the `Object.defineProperty` setter and `_accessorFns[key].set`. No change in external behavior.
- 3b1143f: Warn in development when `createStore` is called for an already-registered id with a **different** definition reference. The registry is first-wins per id and the later definition has always been silently discarded; that silence bites in tests that forget `resetRegistry()` and under Vite HMR when a definition is edited but never takes effect. Passing the same function reference again — the normal path when `@byrding/react` and `@byrding/vue` both register one exported definition, or on an HMR re-evaluation of an unchanged module — stays silent. The warning is emitted once per id via `devWarn` and is a no-op when `NODE_ENV === 'production'`. Internal: `StoreInstance` gains a `_definition` field holding the registering reference.

## 0.10.0

### Minor Changes

- 66d904c: Add cross-store reactive subscriptions and cycle detection (#82).

  Computed getters that read another store via `useStore()` now automatically
  re-notify their own subscribers when the upstream store changes. A DFS
  in-stack cycle guard detects circular reactive dependencies between stores and
  throws `ByrdingCycleError` before the call stack overflows.

  New exports: `ByrdingCycleError`, `storeDepEdges`, `registerCrossStoreDep`,
  `removeStoreDeps`, `resetDepEdges`, `notifyCrossStoreDeps`.

- c13fc01: feat: reactive get/set property accessors

  Properties with both a getter and setter are now classified as accessor state rather than
  computed. Writes go through the reactive surface and notify subscribers; getSnapshot()
  includes the getter's current value for each accessor key.

- 76d814c: Add `$patch()` — batch state update with a single subscriber notification (#92).

  `store.$patch({ key: value, ... })` applies multiple state mutations atomically.
  Subscribers are notified exactly once regardless of how many keys changed, preventing
  redundant React re-renders from multi-key updates.

  - Unknown keys are silently ignored.
  - Keys whose value is strictly unchanged are skipped (no notification if nothing changed).
  - Plugin `onStateChange` fires per changed key; subscribers fire once via `notify('*')`.
  - Snapshot cache is invalidated once; cross-store deps are propagated once.

- 7c3c093: Add `$reset()` method to every store instance. Calling `store.$reset()` restores all state keys to their initial values in a single operation, only notifying subscribers for keys that actually changed. Both class and closure definition styles are supported.

## 0.9.0

### Minor Changes

- Add `useStore()` inter-store composition accessor (issue #81). Factory functions and class constructors now receive a `useStore<T>(id)` context argument that returns a lazy live proxy to any registered store. Forward references are supported: the proxy resolves from the registry at first property access, not at call time.

## 0.8.0

### Minor Changes

- 1344dab: Add createMockStore() testing utility exported from @byrding/core/testing. Returns a plain object with initial state values and action spies for component test isolation.
- 26c6a58: Add `getContext()` to `ByrdingDevtoolsHook` interface and the installed `window.__BYRDING_DEVTOOLS__` object. Delegates to core `getContext()`. Available for browser console debugging and Chrome DevTools Extension (#39) without requiring an ES module import.
- 4035ce0: Add `getContext()` — walks `storeRegistry` and returns a fully serializable `ByrdingContext` snapshot (state, stateSchema, actions, computed, subscriberCount per store). Tree-shakeable named export. Designed for LLM prompt injection and `.byrding-context.json` generation.

### Patch Changes

- 5839498: Consolidate ImportMeta.hot augmentation into core to fix TS2717 conflict between data and accept declarations.

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
