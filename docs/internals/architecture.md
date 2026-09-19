# Architecture

How `@byrding/core` turns a class or a factory into a shared, subscribable store, and how the adapters sit on top. This page describes the code as it is; the implementation contract is `.claude/docs/byrding-refactor-agent-guidance.md`.

[[toc]]

## The registry

`storeRegistry` is a module-level `Map<string, StoreInstance>`. Every package that imports `@byrding/core` resolves the same module, so React and Vue adapters share one map — that is the entire mechanism behind cross-framework sharing. It also means the bundle must contain exactly one copy of core; a second copy would have its own map. Core stamps `globalThis[Symbol.for('byrding.core.instance')]` on initialisation and warns (development only) if it finds the stamp already set by another copy.

Under Vite the map is stored in `import.meta.hot.data`, so a hot update of core re-uses the same instances instead of losing state. Other module-level state (the cross-store dependency edges, the getter-evaluation stack) is **not** preserved across a core hot update — a known limitation.

## `createStore`, step by step

1. **Mark the global core initialised** so `configureByrding` throws from now on.
2. **Return early** if `id` is registered — after a development-only check that the definition reference and the resolved `CoreStore` match the ones that registered it.
3. **Instantiate.** A definition is treated as a class if its source matches `/^\s*class\s/`; otherwise it is called as a factory. Either way it receives a `useStore` function (see below). A module-level flag marks "inside a definition" so `useStore` can refuse calls made later.
4. **Extract plugins** — `static plugins` on a class or a `plugins` key on the factory's object — before classification so they never become state.
5. **Classify** by property descriptor into state, computed, accessor and action keys (own properties, then the immediate prototype).
6. **Build the reactive surface** — two strategies, one per definition style (next section).
7. **Bind** actions and getters to the reactive surface so `this.x` / `store.x` go through it.
8. **Instrument once**: wrap `_notify` and every action (next-but-one section), then register and run `onInit`.

Steps 3–8 happen exactly once per id. Everything a second `createStore` call does is `buildMergedStore` over the existing instance.

## Two reactive strategies

### Class — a Proxy over a plain copy

State field values are copied into a plain object `_raw`. `_proxy = createReactiveState(_raw, notify)` is a `Proxy` whose `set` trap writes to `_raw` and calls `_notify(path, old, new)`. The `get` trap returns nested **plain objects** wrapped in a child Proxy carrying the dotted prefix, so `this.user.name = x` notifies `user.name`. Arrays are returned as-is: their methods keep working but `push`/`splice`/index writes never reach a trap — hence "replace arrays".

Actions and getters are bound not to `_proxy` directly but to a thin wrapper (`bindTarget`) whose `get` trap resolves computed keys through `_getterFns` and accessor keys through `_accessorFns`. Without it, a getter that reads `this.subtotal` would get `undefined` from `_raw`.

### Factory — accessors on the instance itself

The object the factory returned **is** what its closures reference, so it cannot be replaced by a Proxy. Instead each state key is redefined on that object with `Object.defineProperty` — a getter reading from a separate `_raw` map and a setter writing to it and calling `_notify`. `_proxy` is set to the instrumented instance. Only top-level keys are instrumented: `store.user.name = x` mutates the raw nested object with no notification, so nested objects must be replaced.

Accessor keys (`get`/`set` pairs) are re-defined with a wrapped setter that calls the original and then notifies; both styles expose them through `_accessorFns`.

## Instrumented exactly once

Two things are wrapped inside the registration branch:

- **`_notify`** — the wrapper (1) nulls the shared snapshot cache, (2) runs the registering core's global `onStateChange` hooks then the store's own, (3) fires this store's subscribers via `notify`, and (4) propagates to dependent stores via `notifyCrossStoreDeps`.
- **each action** — the wrapper runs `onAction` hooks (global, then local) before the bound action.

Because `createStore` is called once per adapter and again on every hot update, doing this outside the registration branch stacked a wrapper per handle: plugin hooks fired N times and action references differed between handles. The snapshot cache (`_snapshotCache`) and the registering core (`_core`) live on the instance for the same reason.

## Snapshot cache

`getSnapshot()` returns `{ ...raw, ...accessorValues }` and caches it on the instance. `useSyncExternalStore` compares references, so the cache is invalidated only by a real change: the `_notify` wrapper, `$patch`, and cross-store propagation (`_propagate` nulls the dependent's cache before notifying it — it deliberately bypasses the dependent's `_notify` wrapper so plugins are not told about a change that happened elsewhere).

## `$patch` and `$reset`

`$patch` writes state keys straight into `_raw` (skipping the per-key trap), records old/new values, then invalidates the cache, runs `onStateChange` once per changed key, and fires `notify(store, '*')` once — a `'*'` notification fires every callback regardless of its key paths. Accessor keys in the partial go through their setters first and notify individually. `$reset` assigns each changed state key through the reactive surface, so it is one notification per key.

## Cross-store composition

`makeUseStoreFn()` produces the `useStore` passed to definitions. It returns a `Proxy` that resolves the target's merged store from the registry on first access and caches it per id. While a **computed getter** is being evaluated, `buildMergedStore` pushes the evaluating store's id onto a stack; the proxy's `get` trap sees a non-empty stack and records an edge `target → dependent` in `storeDepEdges`. Actions push nothing, so reads inside actions never create edges.

On any change, `notifyCrossStoreDeps` walks the edges depth-first with an in-stack set: each dependent gets its cache cleared and a `'*'` notification, then its own dependents are visited. Revisiting a store already on the current path throws `ByrdingCycleError`; diamonds (two paths to the same store) are fine.

## Adapters

**React** — the hook keeps a stable `componentId` and a stable `subscribe` closure in refs, calls `useSyncExternalStore(subscribe, getSnapshot, getSnapshot)`, and returns core's live merged store. Writes through the returned object go straight to the store. Component names for devtools are inferred from the stack in development only.

**Vue** — the composable creates `shallowReactive({ ...merged })` (evaluating getters once) and, on each matching notification, `Object.assign`s the merged store over it again. Vue re-renders readers of properties whose value changed; action references are unchanged between syncs so templates binding actions do not re-render. Writes on the returned object change the copy only — mutate via actions. Subscriptions are removed on `onUnmounted` when inside a component.

## Disposal

`disposeStore(id)` runs `onDispose` on the registering core and the store's plugins, removes its dependency edges in both directions, clears its subscription maps, nulls the snapshot cache, and deletes the registry entry. It is gated on development: **in production it is a no-op** — a live store is first-wins for the life of the page. `resetRegistry()` disposes every fully constructed instance and clears the map. Handles obtained before disposal are stale; disposal is not an in-place replacement.

## Known limitations

- Arrays are not proxied in either style; nested objects are only proxied in the class style.
- The Vue composable's returned object does not write through.
- Computed values are re-evaluated on every read; nothing memoises them.
- Class detection is a regex on `Function.prototype.toString()`; a minifier that rewrites `class` syntax would misclassify.
- Cross-store dependency edges are not preserved across a core hot update.
