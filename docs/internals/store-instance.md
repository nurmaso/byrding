# `StoreInstance` and the subscription maps

The internal record `createStore` builds for each id. Adapters never touch it — they use `StoreHandle` — but plugins and tooling occasionally read it through `storeRegistry`. Field names starting with `_` are internal and may change in a minor release.

## `StoreInstance`

```ts
interface StoreInstance<TState = Record<string, unknown>, TActions = Record<string, unknown>> {
  id: string

  _raw: TState               // plain state values; getSnapshot() spreads this
  _initialRaw: TState        // shallow copy captured at registration; $reset() restores from it
  _proxy: Record<string, unknown>
                             // class: Proxy over _raw — actions/getters are bound here
                             // factory: the instrumented instance itself

  _stateKeys: string[]
  _actionKeys: string[]
  _computedKeys: string[]
  _accessorKeys: string[]

  _getterFns: Record<string, () => unknown>                                   // computed, bound
  _accessorFns: Record<string, { get(): unknown; set(v: unknown): void }>    // get/set pairs, bound and notifying
  _actionFns: TActions                                                        // bound, then wrapped for onAction

  _updateMap: Map<string, Set<string>>    // keyPath → componentIds subscribed to it ('*' is a key)
  _callbackMap: Map<string, () => void>   // componentId → callback

  _notify(keyPath: string, oldValue?: unknown, newValue?: unknown): void
                             // wrapped once at registration: cache → plugins → subscribers → dependents

  _localPlugins: Plugin[]    // from `plugins` / `static plugins`; run after the global core's
  _core: StoreCoreHooks      // the CoreStore that registered the id (runOnInit/StateChange/Action/Dispose)
  _snapshotCache: Record<string, unknown> | null   // shared by every handle; null = invalidated
  _definition: Function      // registering class/factory; compared by reference to warn on redefinition
}
```

`StoreCoreHooks` is the structural subset of `CoreStore` the instance calls — declared separately so `types.ts` does not import `coreStore.ts`.

## Subscription data structures

`subscribe(store, componentId, keyPaths, callback)`:

- stores `callback` in `_callbackMap` under `componentId`;
- for `['*']`, adds the id to `_updateMap.get('*')`; otherwise adds it to the set for each listed path.

The returned unsubscribe removes the id from every set it was added to and deletes the callback.

## `notify(store, rawKeyPath)`

1. If `rawKeyPath === '*'` (the sentinel used by `$patch` and cross-store propagation), fire **every** callback in `_callbackMap` and return.
2. `normaliseKeyPath`: strip a trailing `.<digits>` and a trailing `.length`, so array writes collapse to the array's own path.
3. Collect component ids from the exact path and each ancestor (`a.b.c` → `a.b` → `a`), then from `'*'`.
4. Fire each collected callback once.

## Key-path normalisation

```
items.0        → items
items.length   → items
user.name      → user.name   (unchanged)
```

Only a single trailing index or `length` is collapsed; nested arrays of objects are not walked.

## Cross-store edges

`storeDepEdges: Map<string, Set<string>>` maps a **watched** store id to the ids that depend on it. `registerCrossStoreDep(from, to)` adds `from` to `to`'s set; `removeStoreDeps(id)` deletes `id` as a key and from every set; `resetDepEdges()` clears the map. A separate module-level stack (`pushEvaluatingStore` / `popEvaluatingStore` / `peekEvaluatingStore`) records which store's computed getter is currently evaluating.
