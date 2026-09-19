# `@byrding/core`

The framework-agnostic engine. Adapters (`@byrding/react`, `@byrding/vue`) are built on it and expose `defineStore`; use core directly from vanilla JS, from a custom adapter, from a plugin, or in tests. Package README: [`packages/core`](https://github.com/nurmaso/byrding/tree/main/packages/core).

[[toc]]

## `createStore(id, definition, options?)`

```ts
function createStore<C extends new () => object>(id: string, definition: C, options?): StoreHandle<StateOf<InstanceType<C>> & ActionsOf<InstanceType<C>>>
function createStore<T extends Record<string, unknown>>(id: string, definition: () => T, options?): StoreHandle<T>

interface CreateStoreOptions {
  /** Run this store under an isolated plugin host instead of the global one. */
  core?: CoreStore
}
```

Registers a store under `id` on the first call and returns a `StoreHandle`. Every later call for the same `id` returns a handle to the **same instance** — the `definition` and `options` arguments are ignored. In development a later call warns once if it passes a different definition reference or resolves a different `core`; in production it is silent. Stores are never replaced in production.

The definition is either:

- a **class** — instantiated with `new`; actions and getters use `this`; or
- a **factory** — called once; must return a plain object whose actions and getters close over that object.

Both receive a [`useStore`](#composing-stores-usestore) function as their first argument for [composing stores](../guide/composing-stores).

### Classification

Every own property of the instance and every member of its immediate prototype is bucketed by its property descriptor (never by reading the value, so getters are not evaluated):

| Descriptor | Bucket | Exposed as |
| --- | --- | --- |
| plain value | **state** | live getter/setter |
| `get x()` only | **computed** | getter, evaluated on every read, not cached |
| `get x()` + `set x(v)` | **accessor** | getter/setter; writes notify `x` |
| function | **action** | bound function, stable reference |

A `plugins` key on a factory's object, or `static plugins` on a class, is extracted first and never becomes state.

## `StoreHandle<T>`

```ts
interface StoreHandle<T> {
  store: MergedStore<T>
  subscribe(componentId: string, keyPaths: KeyPath<T>[], callback: () => void): () => void
  getSnapshot(): StateOf<T>
}
```

### `store` — the merged object

A flat object: state keys (live read/write), computed keys (getter), accessor keys (getter/setter), actions, plus:

- **`$patch(partial)`** — writes each listed state key that actually changed, fires plugin `onStateChange` once per changed key, then notifies subscribers **once** (as a `'*'` change). Accessor keys in the partial go through their setters and notify individually. No-op if nothing changed.
- **`$reset()`** — restores every state key to the value captured at registration, through the reactive surface, so subscribers are notified **once per changed key**. Accessor keys are not reset.

Writes to state keys through `store` notify subscribers of that key and of every ancestor path.

### `subscribe(componentId, keyPaths, callback)`

Registers `callback` under `componentId` (any unique string; adapters use `generateComponentId()`) for the given paths. Returns an unsubscribe function. A path matches when the changed key path equals it or is a descendant of it (`'user'` fires for a change to `user.name`); `'*'` matches everything. Array index and `length` writes are normalised to the array's path (`items.0` → `items`). A callback runs at most once per notification even if several of its paths match.

`keyPaths: KeyPath<T>[]` — see [`KeyPath`](#keypath-t).

### `getSnapshot()`

A shallow copy of the raw state (state keys and accessor values; **no computed, no actions**). The reference is cached and reused until the next change — a mutation, `$patch`, `$reset`, or a change in a store this one depends on — after which a new object is returned. This is what React's `useSyncExternalStore` compares.

## Types

### `KeyPath<T>`

```ts
type KeyPath<T> = '*' | Key | `${Key}.${string}`   // Key = state and computed keys of T (functions excluded)
```

Only the root segment is checked against the store, so nested and array paths are accepted under any real key. A plain `string[]` is **not** assignable; type variables as `KeyPath<T>[]` or use `as const`.

### `MergedStore<S, A>`, `StateOf<T>`, `ActionsOf<T>`

`StateOf<T>` keeps the non-function properties of `T` (state, computed, accessor); `ActionsOf<T>` keeps the functions. `MergedStore<S, A> = S & A & { $reset(): void; $patch(partial: Partial<S>): void }`.

### `StoreInstance`, `StoreCoreHooks`

The internal representation of a registered store and the subset of `CoreStore` it calls. Documented in [Internals → StoreInstance](../internals/store-instance).

## Plugins

```ts
interface Plugin<S = Record<string, unknown>> {
  onInit?(storeId: string, snapshot: S): void
  onStateChange?(storeId: string, path: string, next: unknown, prev: unknown): void
  onAction?(storeId: string, actionName: string, args: unknown[]): void
  onDispose?(storeId: string): void
}
type PluginFactory<S> = (...args: unknown[]) => Plugin<S>
```

### `configureByrding({ plugins })`

Registers global plugins on the default `CoreStore`. **Must run before any store is created** — it throws once `createStore` has been called anywhere, including for stores using an isolated `core`.

### `CoreStore`

```ts
class CoreStore {
  constructor(options?: { plugins?: Plugin[] })
  use(plugin: Plugin): void
  readonly initialized: boolean
}
```

The plugin host. `coreStore` is the global instance `configureByrding` targets. Pass a fresh `new CoreStore({ plugins })` as `createStore`'s `options.core` to run a store under its own plugin list; global plugins then do **not** run for that store.

### Per-store plugins

```ts
createStore('cart', () => ({ plugins: [persistPlugin()], items: [] }))   // factory: `plugins` key
class Cart { static plugins = [persistPlugin()]; items = [] }             // class: static field
```

### Hook semantics

- Order: the registering core's global plugins first, then the store's own plugins.
- Each hook fires **exactly once** per event regardless of how many `createStore` / `defineStore` calls exist for the id.
- `onInit` receives the initial snapshot including accessor values.
- `onStateChange` receives the normalised path and both values; `$patch` fires it once per changed key.
- `onAction` fires before the action body runs.
- `onDispose` fires from `disposeStore` / `resetRegistry` (development and tests only).

Guide: [Plugins](../guide/plugins).

## Composing stores — `useStore`

```ts
type UseStoreFn = <T extends Record<string, unknown>>(id: string) => T
```

Passed as the first argument to every factory and class constructor. Returns a lazy proxy for another store's merged object; the target is resolved from the registry on first property access, so forward references work as long as the target is registered before it is first read. Calling `useStore` **outside** the definition phase throws.

Capture the returned proxy in a closure variable. Storing it on a class instance either breaks (an own property is classified as an action and rebound; a `#private` field is unreadable from the bound getter) or leaks into state — see [Composing stores → Class style](../guide/composing-stores#class-style).

In TypeScript, declare the parameter **optional** (`(useStore?: UseStoreFn) => …`, read as `useStore!`): the `createStore` / `defineStore` overloads currently type the definition as zero-argument, so a required parameter does not compile. See the warning in [Composing stores](../guide/composing-stores).

Reading a proxied property inside a **computed getter** registers a reactive dependency edge: when the target store changes, this store's subscribers are notified (as `'*'`) and its snapshot cache is invalidated. Reads inside actions register nothing. Dependency cycles throw `ByrdingCycleError` (with a `.cycle` array) at notification time.

Guide: [Composing stores](../guide/composing-stores).

## `watchState(handle, key, callback)`

```ts
function watchState<T, K extends keyof StateOf<T> & string>(
  handle: StoreHandle<T>, key: K, callback: (next: StateOf<T>[K], prev: StateOf<T>[K]) => void,
): { get(): StateOf<T>[K]; set(value: StateOf<T>[K]): void; unwatch(): void }
```

Vanilla-JS watcher for one state key. `set` writes through the store (notifying everyone), `get` reads live, `unwatch` removes the subscription. Takes a `StoreHandle`, so it is for core users — adapters do not expose the handle.

## Devtools

### `devtoolsPlugin()`

A `PluginFactory`. Calling it installs the global hook and returns a plugin that emits `store:init` (on `onInit`), `state:change` and `action:before`. Register it like any plugin:

```ts
configureByrding({ plugins: [devtoolsPlugin()] })
```

### `installDevtoolsHook()`, `getDevtoolsHook()`

Create (once) or read `window.__BYRDING_DEVTOOLS__`, an object with `emit(event)`, `on(handler) → off` and `getContext()`. The adapters emit `component:mounted`, `component:rendered` and `component:unmounted` through it when present. Event payload types: `DevtoolsEvent` and the `Devtools*` interfaces.

### `getContext()`

```ts
interface ByrdingContext {
  version: string          // the installed @byrding/core version
  timestamp: string        // ISO 8601
  stores: Record<string, {
    state: Record<string, unknown>
    stateSchema: Record<string, string>   // typeof each state key
    actions: string[]
    computed: Record<string, unknown>     // evaluated now; null if the getter threw
    subscriberCount: number
  }>
}
```

JSON-safe. Consumed by the devtools extension and by [`@byrding/vite`](../guide/devtools#byrding-vite), which writes it to `.byrding-context.json` during `vite dev` for LLM tooling.

Guide: [Devtools](../guide/devtools).

## Development and test utilities

| Export | Behaviour |
| --- | --- |
| `resetRegistry()` | Disposes every registered store (runs `onDispose`, removes dependency edges, clears subscriptions) and empties the registry. Call in `beforeEach`. |
| `disposeStore(id): boolean` | Disposes one store so the next `createStore(id)` starts fresh. Returns `true` if a store was disposed. **In production it is a no-op returning `false`.** Handles obtained before disposal are stale afterwards. |
| `resetDepEdges()` | Clears the cross-store dependency graph (`resetRegistry` already does this per store). |
| `resetDevWarnings()` | Lets deduplicated dev warnings fire again. |
| `devWarn(message)`, `isDev()` | `console.warn` once per message, prefixed `[byrding]`, only when `process.env.NODE_ENV !== 'production'`. |
| `createMockStore(def, spyFn?)` from `@byrding/core/testing` | Instantiates the definition and returns its initial state with every action replaced by `spyFn()` (e.g. `vi.fn`). Computed keys are omitted. |

### Development warnings

All are emitted once, only in development:

- `createStore('<id>')`: a different definition was passed than the one that registered this id — first registration wins.
- `createStore('<id>')`: a different `options.core` was passed than the one that registered this id.
- Two copies of `@byrding/core` are loaded — each has its own registry, so cross-framework sharing breaks. Deduplicate the dependency.

## Hot module replacement

Under Vite the registry is kept in `import.meta.hot.data`, so editing a store module keeps state, subscriptions and action bindings alive. Because first registration wins, an **edited definition does not take effect** on hot update — you get the warning above; reload the page.

## Lower-level exports

`storeRegistry`, `subscribe`, `notify`, `classify`, `createReactiveState`, `normaliseKeyPath`, `buildMergedStore`, `makeUseStoreFn`, `generateComponentId`, `storeDepEdges`, `registerCrossStoreDep`, `removeStoreDeps`, `notifyCrossStoreDeps`, `ByrdingCycleError`. These are the pieces adapters are built from; see [Internals](../internals/architecture).
