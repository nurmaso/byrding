# Composing stores

A store can read other stores. The definition — factory or class constructor — receives a `useStore` function as its first argument:

```ts
// stores/user.ts
export const useUser = defineStore('user', () => {
  const store = { discount: 0.1, setDiscount(d: number) { store.discount = d } }
  return store
})

// stores/cart.ts
import type { UseStoreFn } from '@byrding/core'

export const useCart = defineStore('cart', (useStore?: UseStoreFn) => {
  const user = useStore!<{ discount: number }>('user')
  const store = {
    items: [] as Array<{ price: number }>,
    get total() {
      return store.items.reduce((s, i) => s + i.price, 0) * (1 - user.discount)
    },
    add(price: number) { store.items = [...store.items, { price }] },
  }
  return store
})
```

::: warning Declare the parameter as optional
`defineStore`/`createStore` currently type the definition as taking **no** arguments, so a definition written as `(useStore: UseStoreFn) => …` fails to compile:

> Target signature provides too few arguments. Expected 1 or more, but got 0.

Writing `useStore?: UseStoreFn` (and reading it as `useStore!`) satisfies the declared signature and is correct at runtime — core always passes the function. In plain JavaScript neither form matters. A type-level fix is tracked as a follow-up.
:::

## Class style

A class constructor receives `useStore` too, but **where you put the handle matters**. Capture it in a variable in the module scope, not on the instance:

```ts
import type { UseStoreFn } from '@byrding/core'

let user: { discount: number }

class Cart {
  constructor(useStore?: UseStoreFn) {
    user = useStore!<{ discount: number }>('user')
  }

  items: Array<{ price: number }> = []

  get total() {
    return this.items.reduce((s, i) => s + i.price, 0) * (1 - user.discount)
  }
}

export const useCart = defineStore('cart', Cart)
```

Three tempting alternatives do **not** work:

| Pattern | What happens |
| --- | --- |
| `constructor(private useStore) {}`, then `this.useStore(…)` in a getter | `useStore` becomes an own function property, so it is classified as an **action** and rebound — the getter throws `this.useStore is not a function`. |
| A `#private` field holding the handle | Getters are bound to an internal proxy, not the instance, so reading `this.#user` throws `Cannot read private member`. |
| A public field: `this.user = useStore('user')` | Works and stays reactive, but the handle is classified as **state**: it shows up in `getSnapshot()`, in `getContext()` (serialising as `{}`), and in devtools. |

The factory style above avoids all of this, which is why it is the better fit for composed stores.

## Reactivity across stores

When a **computed getter** reads another store through `useStore`, byrding records that `cart` depends on `user`. From then on, any change to `user` — a write, `$patch`, or `$reset` — also notifies `cart`'s subscribers and invalidates `cart`'s snapshot, so a React component that reads only `cart.total` re-renders when `user.setDiscount()` runs.

Reads inside **actions** record nothing; they just see the current value.

The dependency is recorded the first time the getter actually runs, so a store whose computed has never been read is not yet linked. In practice a component that renders the value reads it immediately.

## Rules

- **Definition phase only.** `useStore` throws if called after the factory/constructor has returned. Capture the proxy in the definition (as above) and use it later.
- **Forward references are fine** as long as the target store is registered before its first property read. Registering `cart` before `user` works; reading `cart.total` before `user` exists throws with a clear message.
- **Cycles throw.** If `a` reads `b` in a getter and `b` reads `a`, the first change raises `ByrdingCycleError` (its `.cycle` lists the ids). Diamonds — `a` reads `b` and `c`, both read `d` — are fine.
- **Type the handle yourself.** `useStore<T>(id)` takes the target's state/computed shape as a type argument; nothing links it to the other store's definition.
- **Keep the handle out of the instance.** In class style, storing it on `this` either breaks (own property or `#private`) or leaks into state — see [Class style](#class-style).
- **Computed-only stores work.** A store with no state of its own, only getters over other stores, still re-renders its subscribers when its sources change.
