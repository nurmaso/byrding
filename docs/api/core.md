# `@bocal/core`

Framework-agnostic reactivity engine. App code does not call this package directly — it's the substrate for `@bocal/react` and `@bocal/vue`. Use this reference if you're writing a new adapter or debugging.

## `createStore(id, definition)`

```ts
function createStore<T>(
  id: string,
  definition: (new () => T) | (() => T),
): CoreStore<T>
```

Register (or retrieve) a store. First registration for a given `id` wins; subsequent calls return the same singleton and the `definition` argument is discarded.

Returns a `CoreStore<T>`:

```ts
interface CoreStore<T> {
  /** Live flat merged object — state getters/setters, computed getters, action functions. */
  store: T

  /** Register a subscriber. Returns an unsubscribe function. */
  subscribe(
    componentId: string,
    keyPaths: string[],
    callback: () => void,
  ): () => void

  /** Cached snapshot of raw state — new reference on each mutation. */
  getSnapshot(): Partial<T>
}
```

### Class vs closure dispatch

Internally, `createStore` detects the definition style:

- `/^\s*class\s/` match on the function source → **class** strategy: `_proxy` is a `new Proxy(_raw)`; actions bound to the proxy.
- Anything else → **closure factory** strategy: each state property on the returned instance is redefined with `Object.defineProperty(inst, key, { get, set })` that reads/writes a separate `_raw` values map and calls `_notify`.

Actions, getters, and state fields are then all bound/exposed on the flat merged store.

## `generateComponentId()`

```ts
function generateComponentId(): string
```

Returns `bocal_1`, `bocal_2`, … — a process-unique opaque ID. Used by adapters to distinguish subscribers in the `subscribe`/`notify` map.

## `subscribe(store, componentId, keyPaths, callback)`

```ts
function subscribe(
  store: StoreInstance,
  componentId: string,
  keyPaths: string[],
  callback: () => void,
): () => void
```

Low-level subscribe. Adapters call this from their own hook/composable. `keyPaths` may be either a list of dot paths or `['*']` (wildcard).

## `notify(store, keyPath)`

```ts
function notify(store: StoreInstance, rawKeyPath: string): void
```

Low-level notify. Normalises `keyPath` (strips `.<number>` array indices and trailing `.length`), then fires callbacks for:

1. exact match on `keyPath`
2. every ancestor path (`a.b.c` → `a.b` → `a`)
3. the `*` wildcard bucket

Each callback runs at most once per call, even if it matches multiple paths.

## `storeRegistry`

```ts
const storeRegistry: Map<string, StoreInstance>
```

The module-level singleton map keyed by store `id`. This is what enables cross-framework sharing — both adapters touch the same map. Do not delete entries manually in production code; it breaks reactivity on any live subscriber.

## Types

```ts
interface StoreInstance {
  id: string
  _raw: Record<string, unknown>
  _proxy: Record<string, unknown>
  _stateKeys: string[]
  _actionKeys: string[]
  _computedKeys: string[]
  _getterFns: Record<string, () => unknown>
  _actionFns: Record<string, (...args: unknown[]) => unknown>
  _updateMap: Map<string, Set<string>>
  _callbackMap: Map<string, () => void>
  _notify: (keyPath: string) => void
}
```

## Helpers

```ts
function classify(instance: object): {
  stateKeys: string[]
  actionKeys: string[]
  computedKeys: string[]
}

function createReactiveState(
  target: Record<string, unknown>,
  notify: (keyPath: string) => void,
  prefix?: string,
): Record<string, unknown>

function normaliseKeyPath(keyPath: string): string
```

- `classify` walks the prototype chain to separate state, getters, and methods using `getOwnPropertyDescriptors` (never a live read — that would trigger getters).
- `createReactiveState` builds the `Proxy` used for class-style stores.
- `normaliseKeyPath` collapses `items.0` → `items` and `items.length` → `items`.
