# Cross-framework sharing

Because the reactivity engine lives in `@bocal/core`, a single store instance can back components in multiple frameworks at the same time. Mutate from a React button, a Vue component subscribed to that key re-renders — and vice versa.

## How it works

1. `@bocal/core` keeps a module-level `storeRegistry` keyed by the store's `id` string.
2. `defineStore(id, definition)` in either adapter calls `createStore(id, definition)` on the core. The core returns the existing singleton if `id` is already registered, otherwise it instantiates.
3. Each adapter wires its own framework reactivity on top of the shared singleton:
   - React: `useSyncExternalStore` driven by the core's subscribe/notify.
   - Vue: a `shallowReactive` copy synced with `Object.assign` on notification.
4. Mutations go through the single underlying instance, so notifications fan out to every subscriber regardless of which adapter registered them.

## Pattern: shared definition file

Export the `id` and the class/factory from one file. Each framework imports and wraps:

```ts
// shared/cart.store.ts
export const cartId = 'cart'

export class CartStore {
  items: Array<{ id: string; qty: number }> = []
  taxRate = 0.19

  get totalItems() {
    return this.items.reduce((s, i) => s + i.qty, 0)
  }

  addItem(id: string) {
    const existing = this.items.find((i) => i.id === id)
    if (existing) existing.qty++
    else this.items.push({ id, qty: 1 })
  }

  clear() {
    this.items = []
  }
}
```

```ts
// react-app/useCartStore.ts
import { defineStore } from '@bocal/react'
import { cartId, CartStore } from '../shared/cart.store'

export const useCartStore = defineStore(cartId, CartStore)
```

```ts
// vue-app/useCartStore.ts
import { defineStore } from '@bocal/vue'
import { cartId, CartStore } from '../shared/cart.store'

export const useCartStore = defineStore(cartId, CartStore)
```

Both `defineStore` calls hit the same entry in the registry. Only the first call actually instantiates `CartStore`; the second wraps the existing singleton in a Vue composable.

## Live example

See [`playground/`](/examples/playground) for a runnable React + Vue app sharing a single `CartStore`.

## Rules and gotchas

- **First registration wins.** If the first adapter to call `defineStore('cart', ClassA)` has registered the store, a later call `defineStore('cart', ClassB)` silently returns the existing `ClassA`-backed singleton. Keep one shared definition file as the source of truth.
- **Action identity is stable.** Across re-renders and across adapters, `store.addItem === store.addItem` holds. You can safely pass actions as props or event handlers.
- **Do not mutate shared state during render.** Same rule as any other store. Mutate inside event handlers, effects, or actions.
- **Computed values are not cached.** If React and Vue both read `store.total`, the getter runs once per read per framework. For expensive computeds, cache inside the getter yourself.

Next: browse the [API reference](/api/core).
