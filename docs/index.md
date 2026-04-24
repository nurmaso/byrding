---
layout: home

hero:
  name: bocal
  text: A tiny reactive store.
  tagline: Vanilla-JS core, thin React and Vue adapters, one store shared across frameworks.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/nurmaso/bocal

features:
  - title: One core, many frameworks
    details: The reactivity engine is framework-agnostic. React and Vue adapters are thin wrappers; stores can be shared across both at runtime.
  - title: Selective subscriptions
    details: Components subscribe to the exact key paths they care about. A mutation to `user.name` only wakes components that read `user.name`.
  - title: Two definition styles
    details: Write stores as classes (`this`-based actions) or as closure factories. Both produce the same flat API — pick whichever style fits.
  - title: No boilerplate
    details: No actions/getters/state buckets. Just write an object or a class. The adapter returns a hook or composable that gives back the live store.
---

## At a glance

```ts
// stores/counter.ts
import { defineStore } from '@bocal/react'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    get double() {
      return store.count * 2
    },
    increment() {
      store.count++
    },
  }
  return store
})
```

```tsx
// Counter.tsx
function Counter() {
  const store = useCounterStore(['count'])   // re-render only when count changes

  return (
    <button onClick={store.increment}>
      {store.count} × 2 = {store.double}
    </button>
  )
}
```

## Packages

| Package | Description |
| --- | --- |
| [`@bocal/core`](/api/core) | Vanilla JS core — Proxy reactivity, subscription map, store registry. |
| [`@bocal/react`](/api/react) | React adapter — `defineStore` returns a hook via `useSyncExternalStore`. |
| [`@bocal/vue`](/api/vue) | Vue 3 adapter — `defineStore` returns a composable backed by `shallowReactive`. |

## Demos

- [Render-demo](/examples/render-demo) — live re-render counters comparing selective subscriptions vs prop drilling.
- [Playground](/examples/playground) — one `CartStore` shared between a React and a Vue app.
