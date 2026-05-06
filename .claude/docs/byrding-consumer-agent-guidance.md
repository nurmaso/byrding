# Byrding — Consumer Agent Guidance

> Concise best-practice reference for agents generating code that **uses** `@byrding/react` or `@byrding/vue`. Not for agents implementing the library internals.

---

## Install

```bash
# React
npm install @byrding/react

# Vue
npm install @byrding/vue
```

Do not install `@byrding/core` directly. It is an internal dependency of the adapters.

---

## Define a store

Always export the hook/composable from a dedicated store file. Never define inline.

**Class style** (best TypeScript inference):

```ts
// stores/counter.ts
import { defineStore } from '@byrding/react' // or '@byrding/vue'

class CounterStore {
  count = 0

  get double() { return this.count * 2 }

  increment() { this.count++ }
}

export const useCounterStore = defineStore('counter', CounterStore)
```

**Closure style** (no `this`, explicit closure variable):

```ts
// stores/counter.ts
import { defineStore } from '@byrding/react'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})
```

---

## Consume in components

### React

```tsx
import { useCounterStore } from './stores/counter'

function Counter() {
  const store = useCounterStore()         // wildcard subscription
  // const store = useCounterStore(['count'])  // selective — re-renders only when count changes

  return <button onClick={store.increment}>{store.count}</button>
}
```

Destructuring also works:

```tsx
const { count, increment } = useCounterStore()
```

### Vue

```vue
<script setup lang="ts">
import { useCounterStore } from './stores/counter'

const store = useCounterStore()
</script>

<template>
  <button @click="store.increment()">{{ store.count }}</button>
</template>
```

When destructuring in Vue, always use `toRefs` to keep reactivity:

```ts
import { toRefs } from 'vue'
const { count, double } = toRefs(useCounterStore())
```

---

## Cross-framework sharing

Export `id` and definition(s) from a shared file. Import into each framework's `defineStore`. First registration wins — subsequent calls with the same ID get the existing singleton regardless of the definition passed.

```ts
// shared/cart.store.ts
export const cartId = 'cart'
export class CartStore { /* ... */ }
export const cartDefinition = () => { /* ... */ }
```

```ts
// react-app/useCartStore.ts
import { defineStore } from '@byrding/react'
import { cartId, CartStore } from '../shared/cart.store'
export const useCartStore = defineStore(cartId, CartStore)
```

```ts
// vue-app/useCartStore.ts — cartDefinition is discarded; CartStore singleton is returned
import { defineStore } from '@byrding/vue'
import { cartId, cartDefinition } from '../shared/cart.store'
export const useCartStore = defineStore(cartId, cartDefinition)
```

---

## Critical rules

### Always replace arrays — never mutate in place

The Proxy only intercepts property assignments on `_raw`. `push()`, `splice()`, and nested property mutations bypass it silently.

```ts
// ✗ no notification fires
this.items.push({ id, qty: 1 })
existing.qty++

// ✓ assignment triggers the Proxy set trap
this.items = [...this.items, { id, qty: 1 }]
this.items = this.items.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i)
```

### Class actions use `this` — closure actions use the closure variable

```ts
// Class — this is bound to the Proxy
increment() { this.count++ }

// Closure — no this; close over store directly
increment() { store.count++ }
```

### `defineStore` is called once at module level

Not inside components or hooks. The returned hook/composable is what you call per-component.

### Selective subscriptions reduce re-renders

Pass key paths to subscribe only to what the component reads:

```ts
const store = useCounterStore(['count'])  // only re-renders when count changes
```

Use `['*']` (default) only when the component truly needs to react to any change.
