# Playground

Location: [`playground/`](https://github.com/nurmaso/bocal/tree/main/playground)

A cross-framework code sample: a React app and a Vue app share a single `CartStore` at runtime. This folder is currently **source-only** — it demonstrates the wiring pattern but does not ship its own build tooling. Copy the files into your own React / Vue projects to try it live, or open an issue if you'd like a runnable harness added.

## Layout

```
playground/
├── shared/
│   └── cart.store.ts        ← CartStore class + cartDefinition factory + cartId
├── react-app/
│   ├── useCartStore.ts      ← defineStore(cartId, CartStore) from @byrding/react
│   └── Cart.tsx
└── vue-app/
    ├── useCartStore.ts      ← defineStore(cartId, CartStore) from @byrding/vue
    ├── Cart.vue
    └── CartSummary.vue
```

## Key pattern

The `shared/` folder exports both the store `id` (`cartId`) and the definition (a `CartStore` class, or a `cartDefinition` factory — either works). Each framework folder imports both and hands them to its own `defineStore`:

```ts
// react-app/useCartStore.ts
import { defineStore } from '@byrding/react'
import { cartId, CartStore } from '../shared/cart.store'
export const useCartStore = defineStore(cartId, CartStore)
```

```ts
// vue-app/useCartStore.ts
import { defineStore } from '@byrding/vue'
import { cartId, CartStore } from '../shared/cart.store'
export const useCartStore = defineStore(cartId, CartStore)
```

Because both `defineStore` calls route through `@byrding/core`'s `storeRegistry`, the second call finds the existing singleton and wraps it in a Vue composable. **First registration wins** — it does not matter whether React or Vue starts first.

## See also

- [Cross-framework sharing](/guide/cross-framework) — the rules and gotchas.
- [`@byrding/core`](/api/core) — the registry that makes this work.
