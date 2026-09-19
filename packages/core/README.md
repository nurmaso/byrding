# `@byrding/core`

**Most people want an adapter, not this package.** Install [`@byrding/react`](https://www.npmjs.com/package/@byrding/react) or [`@byrding/vue`](https://www.npmjs.com/package/@byrding/vue); each depends on core and exposes `defineStore`, which is the whole consumer API.

Use `@byrding/core` directly when you are:

- using byrding from **vanilla JavaScript** (no framework),
- writing a **new framework adapter**,
- writing a **plugin** (`onInit` / `onStateChange` / `onAction` / `onDispose`), or
- **testing** stores in isolation (`@byrding/core/testing`).

Core is the framework-agnostic engine: a store registry, Proxy / accessor reactivity, key-path subscriptions, cross-store composition, a plugin host, and dev-only diagnostics. Zero dependencies, 4.1 kB min+gzip, ESM + CommonJS.

```ts
import { createStore, watchState } from '@byrding/core'

const counter = createStore('counter', () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})

counter.subscribe('my-widget', ['count'], () => render(counter.store))
counter.store.increment()        // notifies 'my-widget'; counter.store.double === 2
```

## Install

```bash
npm install @byrding/core
npx jsr add @byrding/core        # JSR (TypeScript source)
```

Node ≥ 18. Adapters pin core with a caret range; keep exactly one copy in your bundle (core warns in development if it finds two — two copies mean two registries and no sharing).

## API

### `createStore(id, definition, options?)` → `StoreHandle<T>`

```ts
function createStore<T>(
  id: string,
  definition: (new () => T) | (() => T),
  options?: { core?: CoreStore },
): StoreHandle<T>

interface StoreHandle<T> {
  store: MergedStore<T>                                            // live flat object + $patch / $reset
  subscribe(componentId: string, keyPaths: KeyPath<T>[], cb: () => void): () => void
  getSnapshot(): StateOf<T>                                        // cached raw state; new reference after each change
}
```

First registration for an `id` wins; later calls return a handle to the same instance and warn in development if the definition or `options.core` differs. The definition is a **class** (actions use `this`) or a **factory** returning a plain object (actions close over the object). Properties are classified as state (plain values), computed (`get x()`), accessor (`get x()` + `set x(v)`) or action (function).

`subscribe` fires `cb` when a path you listed — or any descendant of it — changes; `'*'` means any change. `keyPaths` is typed (`KeyPath<T>`): `'*'`, a state/computed key, or a dotted path under one. `getSnapshot()` is for `useSyncExternalStore`-style integrations: same reference until something changes.

### `store.$patch(partial)` / `store.$reset()`

`$patch` writes several state keys and notifies once (`'*'`); accessor keys go through their setters. `$reset` restores every state key to its initial value, one notification per changed key. Both exist on every merged store, in every adapter.

### Plugins — `configureByrding`, `CoreStore`, `Plugin`

```ts
import { configureByrding } from '@byrding/core'
import { persistPlugin } from '@byrding/plugin-persist'

configureByrding({ plugins: [persistPlugin({ stores: ['cart'] })] })   // before any store is created
```

A `Plugin` implements any of `onInit(storeId, snapshot)`, `onStateChange(storeId, path, next, prev)`, `onAction(storeId, name, args)`, `onDispose(storeId)`. Register globally with `configureByrding` (throws if a store already exists), per store via a `plugins: [...]` key on a factory's object or `static plugins` on a class, or on an isolated host: `createStore(id, def, { core: new CoreStore({ plugins }) })`. Global hooks run before per-store hooks; each fires exactly once per event however many handles exist. See [Plugins](https://github.com/nurmaso/byrding/blob/main/docs/guide/plugins.md).

### Composing stores — `useStore` inside a definition

```ts
const cart = createStore('cart', (useStore) => {
  const user = useStore<{ discount: number }>('user')      // lazy proxy to another store
  const store = {
    items: [] as number[],
    get total() { return store.items.length * 10 * (1 - user.discount) },
  }
  return store
})
```

The factory (or class constructor) receives `useStore`. Reading another store inside a **computed** registers a dependency: when `user` changes, `cart`'s subscribers are notified too. Forward references work as long as the target is registered before its first property read. Cycles throw `ByrdingCycleError`. See [Composing stores](https://github.com/nurmaso/byrding/blob/main/docs/guide/composing-stores.md).

### `watchState(handle, key, cb)`

```ts
const w = watchState(counter, 'count', (next, prev) => console.log(prev, '→', next))
w.set(5); w.get(); w.unwatch()
```

Vanilla-JS watcher for one state key on a `StoreHandle`.

### Devtools — `devtoolsPlugin`, `getContext`, `installDevtoolsHook`

`devtoolsPlugin()` is a plugin factory that installs `window.__BYRDING_DEVTOOLS__` and emits `store:init`, `state:change`, `action:before` events; the adapters add `component:mounted` / `rendered` / `unmounted`. `getContext()` returns a JSON-safe description of every registered store (state, schema, actions, computed values, subscriber count) plus the package version — the same payload the [Chrome extension](https://github.com/nurmaso/byrding/tree/main/packages/devtools-extension) and [`@byrding/vite`](https://github.com/nurmaso/byrding/tree/main/packages/vite) consume. See [Devtools](https://github.com/nurmaso/byrding/blob/main/docs/guide/devtools.md).

### Development and test utilities

| Export | What it does |
| --- | --- |
| `resetRegistry()` | Test teardown: disposes every store (plugin `onDispose`, dep edges, subscriptions) and empties the registry. |
| `disposeStore(id)` | Remove one store so the next `createStore(id)` starts fresh. **No-op in production** — live stores are never replaced. |
| `createMockStore(def, spyFn?)` from `@byrding/core/testing` | The definition's initial state with every action replaced by `spyFn()` (e.g. `vi.fn`). |
| `devWarn` / `isDev` / `resetDevWarnings` | The dev-only warning helpers core uses; silent when `NODE_ENV === 'production'`. |

Development warnings you may see: a second `createStore` for an id with a different definition; a different `options.core` for a registered id; a second copy of `@byrding/core` initialising.

### Lower-level exports

`storeRegistry`, `subscribe`, `notify`, `classify`, `createReactiveState`, `normaliseKeyPath`, `buildMergedStore`, `makeUseStoreFn`, `generateComponentId`, `storeDepEdges`, `registerCrossStoreDep`, `removeStoreDeps`, `notifyCrossStoreDeps`, `ByrdingCycleError`. These are what adapters are built from; their contracts are documented in [Internals](https://github.com/nurmaso/byrding/tree/main/docs/internals).

### Types

`StoreHandle<T>`, `MergedStore<S, A>`, `StateOf<T>`, `ActionsOf<T>`, `KeyPath<T>`, `Plugin`, `PluginFactory`, `UseStoreFn`, `StoreInstance` (internal shape), `StoreCoreHooks`, `ByrdingContext`, `StateWatcher`, and the `Devtools*` event types.

## Things to know

- **Replace arrays; don't mutate them in place.** `push`/`splice` never notify, in either style.
- **Nested writes depend on the definition style.** Class stores proxy nested plain objects (`this.user.name = x` notifies `user.name`); factory stores instrument only top-level keys, so replace the object.
- **Computed values are not cached** and are not part of `getSnapshot()`.
- **Stores are never replaced in production.** First registration wins for the life of the page; `disposeStore` exists for tests and dev tooling only.

## Documentation

[Guide](https://github.com/nurmaso/byrding/tree/main/docs/guide) · [API reference](https://github.com/nurmaso/byrding/blob/main/docs/api/core.md) · [Internals](https://github.com/nurmaso/byrding/tree/main/docs/internals) · [Changelog](https://github.com/nurmaso/byrding/blob/main/packages/core/CHANGELOG.md)

Writing an adapter or modifying core? Read the [refactor agent guidance](https://github.com/nurmaso/byrding/blob/main/.claude/docs/byrding-refactor-agent-guidance.md) — it is the implementation contract.

MIT
