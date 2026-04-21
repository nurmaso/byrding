# Getting started

`bocal` is a monorepo with three published packages and two demo apps:

```
bocal/
├── packages/
│   ├── core/                  @bocal/core — framework-agnostic reactivity
│   ├── react/                 @bocal/react — useStore hook via useSyncExternalStore
│   └── vue/                   @bocal/vue — composable via shallowReactive
├── playground/                cross-framework smoke test (React + Vue share one CartStore)
├── render-demo/               re-render visualiser (React)
└── docs/                      this documentation (VitePress)
```

## Install

The repo uses [pnpm workspaces](https://pnpm.io/workspaces). Clone it and install from the root:

```bash
git clone https://github.com/nurmaso/bocal.git
cd bocal
pnpm install
```

## Run the demos

```bash
pnpm dev:render-demo   # re-render visualiser on http://localhost:5174
```

The [`playground/`](https://github.com/nurmaso/bocal/tree/main/playground) directory is a source-only reference showing how the same `CartStore` is wired into a React app and a Vue app.

## Run the docs locally

```bash
pnpm docs:dev          # VitePress dev server
pnpm docs:build        # static build into docs/.vitepress/dist
```

## The 30-second model

1. Define a store once — as a class or as a closure factory.
2. Wrap it with `defineStore(id, definition)` from either `@bocal/react` or `@bocal/vue`. You get back a hook or composable.
3. Call the hook with an optional `keyPaths` array to subscribe only to the keys you care about. Default is `['*']` (subscribe to everything).
4. Read state with `store.foo`, call actions with `store.doSomething()`. Writes (`store.foo = x` or `this.foo = x` inside an action) trigger re-renders on subscribed components only.

## Your first store

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
import { useCounterStore } from './stores/counter'

export function Counter() {
  const store = useCounterStore(['count'])
  return (
    <button onClick={store.increment}>
      count: {store.count} — double: {store.double}
    </button>
  )
}
```

Next: [Defining stores](./defining-stores) walks through the two definition styles and their tradeoffs.
