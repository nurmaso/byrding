# Defining stores

A store definition is either:

- a **class** — actions use `this`, or
- a **closure factory** — a function that returns a plain object; actions close over the returned `store` variable.

Both styles produce the same flat API at consumption time. Pick whichever fits your codebase.

## Style A — class

```ts
// stores/counter.ts
import { defineStore } from '@byrding/react'

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
import { defineStore } from '@byrding/react'

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

## What counts as state, computed, accessor, and action?

At registration time the core classifies each property on the instance by its property descriptor (it never reads the value, so getters are not evaluated):

- **State** — any plain data property.
- **Computed** — a getter without a setter (`get foo()`).
- **Accessor** — a getter *with* a setter (`get foo()` + `set foo(v)`). Reads go through the getter, writes through the setter and then notify subscribers of `foo`. Handy for derived-but-writable values such as a temperature in two units.
- **Action** — any function-valued property (including prototype methods for classes).

A `plugins` key (factory) or `static plugins` (class) is extracted before classification — see [Plugins](./plugins).

Computed values are re-evaluated on every read. They are not cached — byrding relies on the subscription system to limit re-renders instead.

## Consuming

```tsx
const store = useCounterStore()
store.count           // read state
store.double          // read computed (getter called)
store.increment()     // action
store.$patch({ count: 5, tax: 0.2 })   // several keys, one notification
store.$reset()        // every state key back to its initial value
```

**Direct writes differ by adapter.** In React the hook returns the live store, so `store.count = 5` writes through and notifies. In Vue the composable returns a synced *copy*: `store.count = 5` changes only that copy, and the next sync overwrites it — mutate through actions or `$patch` instead.

Destructuring state properties loses reactivity (same as with `ref`s or `reactive` in Vue):

```ts
// ✗ count is a snapshot at render time, actions still work
const { count, increment } = useCounterStore()

// ✓ store is live
const store = useCounterStore()
```

## Writes that do not notify

Two cases silently bypass reactivity in both adapters:

- **In-place array mutation.** `items.push(x)`, `splice`, `sort`, `items[0] = x` — arrays are never proxied. Replace the array: `this.items = [...this.items, x]`.
- **Nested writes in a closure-factory store.** Only the object's top-level keys are instrumented, so `store.user.name = x` (even inside an action) notifies nothing. Replace the object: `store.user = { ...store.user, name: x }`. Class stores proxy nested plain objects, so `this.user.name = x` *does* notify `user.name` there.

Next: [Selective subscriptions](./selective-subscriptions) — the key feature that keeps re-renders minimal.
