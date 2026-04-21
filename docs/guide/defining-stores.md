# Defining stores

A store definition is either:

- a **class** — actions use `this`, or
- a **closure factory** — a function that returns a plain object; actions close over the returned `store` variable.

Both styles produce the same flat API at consumption time. Pick whichever fits your codebase.

## Style A — class

```ts
// stores/counter.ts
import { defineStore } from '@bocal/react'

class CounterStore {
  count = 0
  tax = 0.19

  get double() {
    return this.count * 2
  }

  increment() {
    this.count++
  }
}

export const useCounterStore = defineStore('counter', CounterStore)
```

Under the hood: the core builds a `Proxy` over a plain copy of the instance's state fields. Actions are bound to that proxy so `this.count++` goes through the proxy's `set` trap and triggers a notification.

## Style B — closure factory

```ts
// stores/counter.ts
import { defineStore } from '@bocal/react'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    tax: 0.19,

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

Under the hood: the factory is called once. The core redefines each state property on the returned instance with a reactive getter/setter pair. Because actions close over `store` (which IS the instrumented instance), writes like `store.count++` go through the reactive setter.

## When to use which

| Situation | Style |
| --- | --- |
| You want private fields, inheritance, decorators | Class |
| You prefer functional style / no `this` | Closure |
| You need a reusable store family (create many instances) | Closure factory returned from a function |
| You're sharing across React and Vue and want identical source | Either — they're both supported in both adapters |

## What counts as state, computed, and action?

At registration time the core classifies each property on the instance:

- **State** — any plain data property (writable, non-getter).
- **Computed** — any getter (`get foo()`).
- **Action** — any function-valued property (including prototype methods for classes).

Computed values are re-evaluated on every read. They are not cached — bocal relies on the subscription system to limit re-renders instead.

## Consuming

```tsx
const store = useCounterStore()
store.count           // read state
store.double          // read computed (getter called)
store.increment()     // action
store.count = 5       // direct write — equivalent to store.count++ inside an action
```

Destructuring state properties loses reactivity (same as with `ref`s or `reactive` in Vue):

```ts
// ✗ count is a snapshot at render time, actions still work
const { count, increment } = useCounterStore()

// ✓ store is live
const store = useCounterStore()
```

Next: [Selective subscriptions](./selective-subscriptions) — the key feature that keeps re-renders minimal.
