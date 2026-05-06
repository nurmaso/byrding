# Cross-framework sharing

Because the reactivity engine lives in `@byrding/core`, a single store instance can back components in multiple frameworks at the same time. Mutate from a React button, a Vue component subscribed to that key re-renders — and vice versa.

## How it works

1. `@byrding/core` keeps a module-level `storeRegistry` keyed by the store's `id` string.
2. `defineStore(id, definition)` in either adapter calls `createStore(id, definition)` on the core. The core returns the existing singleton if `id` is already registered, otherwise it instantiates.
3. Each adapter wires its own framework reactivity on top of the shared singleton:
   - React: `useSyncExternalStore` driven by the core's subscribe/notify.
   - Vue: a `shallowReactive` copy synced with `Object.assign` on notification.
4. Mutations go through the single underlying instance, so notifications fan out to every subscriber regardless of which adapter registered them.

## Install

```bash
npm install @byrding/react @byrding/vue
```

## Pattern: shared definition file

Export the `id` and one or more definitions from a shared file. Each framework imports and wraps with its own `defineStore` — they can even use different definition styles. Because `createStore` is idempotent, the first adapter to register wins and all subsequent calls receive the same singleton:

```ts
// shared/cart.store.ts
export const cartId = 'cart'

// class style — used by the React adapter
export class CartStore {
  items: Array<{ id: string; qty: number }> = []
  taxRate = 0.19

  get totalItems() {
    return this.items.reduce((s, i) => s + i.qty, 0)
  }

  addItem(id: string) {
    const existing = this.items.find((i) => i.id === id)
    if (existing) {
      this.items = this.items.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i)
    } else {
      this.items = [...this.items, { id, qty: 1 }]
    }
  }

  clear() {
    this.items = []
  }
}

// closure style — used by the Vue adapter (definition discarded; same singleton returned)
export const cartDefinition = () => {
  const store = {
    items: [] as Array<{ id: string; qty: number }>,
    // ...same shape as CartStore
  }
  return store
}
```

```ts
// react-app/useCartStore.ts
import { defineStore } from '@byrding/react'
import { cartId, CartStore } from '../shared/cart.store'

export const useCartStore = defineStore(cartId, CartStore)
```

```ts
// vue-app/useCartStore.ts
import { defineStore } from '@byrding/vue'
import { cartId, cartDefinition } from '../shared/cart.store'

// cartDefinition is discarded — Vue connects to the CartStore singleton React registered
export const useCartStore = defineStore(cartId, cartDefinition)
```

Both `defineStore` calls hit the same entry in the registry. Only the first instantiates the store; the second wraps the existing singleton in a Vue composable.

## Live example

See [`playground/`](/examples/playground) for a runnable React + Vue app sharing a single `CartStore`.

## Rules and gotchas

- **First registration wins.** If the first adapter to call `defineStore('cart', ClassA)` has registered the store, a later call `defineStore('cart', ClassB)` silently returns the existing `ClassA`-backed singleton. Keep one shared definition file as the source of truth.
- **Action identity is stable.** Across re-renders and across adapters, `store.addItem === store.addItem` holds. You can safely pass actions as props or event handlers.
- **Do not mutate shared state during render.** Same rule as any other store. Mutate inside event handlers, effects, or actions.
- **Computed values are not cached.** If React and Vue both read `store.total`, the getter runs once per read per framework. For expensive computeds, cache inside the getter yourself.

Next: browse the [API reference](/api/core).
