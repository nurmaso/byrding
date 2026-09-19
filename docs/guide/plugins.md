# Plugins

A plugin is an object with any of four hooks. Register it globally, per store, or on an isolated host.

```ts
import type { Plugin } from '@byrding/core'

const logger: Plugin = {
  onInit(storeId, snapshot)                  { console.log('init', storeId, snapshot) },
  onStateChange(storeId, path, next, prev)   { console.log(storeId, path, prev, '→', next) },
  onAction(storeId, name, args)              { console.log(storeId, name, args) },
  onDispose(storeId)                         { console.log('disposed', storeId) },
}
```

## Registering

### Globally — `configureByrding`

```ts
import { configureByrding } from '@byrding/core'
configureByrding({ plugins: [logger] })
```

Runs for every store. **Call it before any store is created** — it throws once `createStore`/`defineStore` has run anywhere, including for stores using an isolated host. In an app, do this in your entry file before importing store modules.

It is effectively **once per process**: `resetRegistry()` clears stores but does *not* re-arm `configureByrding`, so a test file that has already created a store cannot call it. Use an [isolated host](#isolated-plugin-hosts) in tests instead.

### Per store

```ts
// factory: a `plugins` key on the returned object (removed before classification — it is not state)
export const useCart = defineStore('cart', () => ({ plugins: [logger], items: [] }))

// class: a static field
class Cart { static plugins = [logger]; items = [] }
```

### Isolated plugin hosts

```ts
import { CoreStore } from '@byrding/core'
const core = new CoreStore({ plugins: [logger] })
export const useCart = defineStore('cart', Cart, { core })
```

The store runs under `core`'s plugins and **not** the global ones. Only the `core` passed by the call that registers the id counts; a later `defineStore('cart', …)` with a different `core` warns in development and is ignored.

## What fires when

| Hook | Fires | Notes |
| --- | --- | --- |
| `onInit(id, snapshot)` | once, at registration | `snapshot` = initial state incl. accessor values |
| `onStateChange(id, path, next, prev)` | every state or accessor write | `path` is normalised (`items.0` → `items`); `$patch` fires once per changed key; `$reset` once per changed key |
| `onAction(id, name, args)` | before an action body runs | not for `$patch` / `$reset` |
| `onDispose(id)` | `disposeStore` / `resetRegistry` | development and tests only |

Global plugins run before the store's own plugins. Each hook fires **exactly once** per event however many times the store was defined (React + Vue adapters, hot updates).

## `@byrding/plugin-persist`

```ts
import { persistPlugin } from '@byrding/plugin-persist'

// per store
class Settings { static plugins = [persistPlugin({ keys: ['theme'] })]; theme = 'light' }

// global — `stores` allowlist is required
configureByrding({ plugins: [persistPlugin({ stores: ['settings', 'cart'] })] })
```

| Option | Default | |
| --- | --- | --- |
| `keys` | all state keys in the init snapshot | which keys to persist |
| `storage` | `localStorage` | any `Storage`-like object (`sessionStorage`, a memory shim) |
| `prefix` | `byrding:<storeId>` | storage key is `<prefix>:<key>` |
| `serialize` / `deserialize` | `JSON.stringify` / `JSON.parse` | per-value codec |
| `stores` | — | id allowlist; required for global registration |

On `onInit` it rehydrates matching keys by writing straight into raw state — silently, so no `onStateChange` fires and subscribers are not woken during startup. On `onStateChange` it writes the new value. When storage is unavailable (SSR, Node, blocked) every operation is a no-op; a `QuotaExceededError` on write is caught and logged with `console.warn`.

## Writing your own

- Keep hooks synchronous and cheap; `onStateChange` runs on every write, before subscribers are notified.
- Read a store's internals through `storeRegistry.get(id)` if you must (as `plugin-persist` does to rehydrate silently); the shape is documented in [Internals → StoreInstance](../internals/store-instance) and is not covered by semver guarantees.
- The devtools plugin is an ordinary plugin: `devtoolsPlugin()` returns one. See [Devtools](./devtools).
