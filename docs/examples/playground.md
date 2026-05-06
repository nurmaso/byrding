# Playground

Location: [`playground/`](https://github.com/nurmaso/bocal/tree/main/playground)

A runnable cross-framework demo: a React tree and a Vue tree are mounted on the same page and share a single `CartStore` at runtime. Mutating state from one framework immediately updates the other.

## Run it

```bash
git clone https://github.com/nurmaso/bocal.git
cd byrding
pnpm install
cd playground
pnpm dev
```

Open `http://localhost:5173`.

## Layout

```
playground/
├── index.html               ← two mount points: #react-root and #vue-root
├── main.ts                  ← boots React + Vue into the same page
├── vite.config.ts
├── shared/
│   └── cart.store.ts        ← CartStore class + cartDefinition factory + cartId
├── react-app/
│   ├── useCartStore.ts      ← defineStore(cartId, CartStore)   from @byrding/react
│   └── Cart.tsx
└── vue-app/
    ├── useCartStore.ts      ← defineStore(cartId, cartDefinition) from @byrding/vue
    ├── Cart.vue
    └── CartSummary.vue
```

## Key pattern — one store, two definitions

The shared file exports an `id`, a class, and a factory:

```ts
// shared/cart.store.ts
export const cartId = 'cart'

export class CartStore {
  items: Array<{ id: string; qty: number }> = []
  // ...
}

export const cartDefinition = () => {
  const store = { items: [] as Array<{ id: string; qty: number }>, /* ... */ }
  return store
}
```

React imports the class:

```ts
// react-app/useCartStore.ts
import { defineStore } from '@byrding/react'
import { cartId, CartStore } from '../shared/cart.store.js'
export const useCartStore = defineStore(cartId, CartStore)
```

Vue imports the factory — a different definition, same store:

```ts
// vue-app/useCartStore.ts
import { defineStore } from '@byrding/vue'
import { cartId, cartDefinition } from '../shared/cart.store.js'
export const useCartStore = defineStore(cartId, cartDefinition)
```

Both calls route through `@byrding/core`'s `storeRegistry`. React registers first; Vue's `cartDefinition` is silently discarded and Vue connects to the existing `CartStore` singleton. **First registration wins.**

## Booting both frameworks in one entry

```ts
// main.ts
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Cart, CartSummary } from './react-app/Cart.tsx'

createRoot(document.getElementById('react-root')!).render(
  React.createElement(React.Fragment, null,
    React.createElement(Cart),
    React.createElement(CartSummary),
  ),
)

import { createApp, defineComponent, h } from 'vue'
import VueCart from './vue-app/Cart.vue'
import VueCartSummary from './vue-app/CartSummary.vue'

createApp(defineComponent({ render: () => [h(VueCart), h(VueCartSummary)] }))
  .mount(document.getElementById('vue-root')!)
```

## See also

- [Cross-framework sharing](/guide/cross-framework) — the rules and gotchas.
- [`@byrding/core`](/api/core) — the registry that makes this work.
