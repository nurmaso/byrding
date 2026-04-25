# Getting started

`byrding` is a monorepo with three published packages and two demo apps:

```
byrding/
├── packages/
│   ├── core/                  @byrding/core — framework-agnostic reactivity
│   ├── react/                 @byrding/react — useStore hook via useSyncExternalStore
│   └── vue/                   @byrding/vue — composable via shallowReactive
├── playground/                cross-framework code sample (React + Vue share one CartStore)
├── render-demo/               re-render visualiser (React)
└── docs/                      this documentation (VitePress)
```

## Install from npm

```bash
# React project
npm install @byrding/react

# Vue project
npm install @byrding/vue

# Vanilla JS / custom adapter
npm install @byrding/core
```

## Install from JSR

```bash
# React project
npx jsr add @byrding/react

# Vue project
npx jsr add @byrding/vue

# Vanilla JS / custom adapter
npx jsr add @byrding/core
```

> JSR takes TypeScript source directly — no compilation step needed for JSR consumers.

## Contributing / local dev

The repo uses [pnpm workspaces](https://pnpm.io/workspaces). Clone it and install from the root:

```bash
git clone https://github.com/nurmaso/bocal.git
cd byrding
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
2. Wrap it with `defineStore(id, definition)` from either `@byrding/react` or `@byrding/vue`. You get back a hook or composable.
3. Call the hook with an optional `keyPaths` array to subscribe only to the keys you care about. Default is `['*']` (subscribe to everything).
4. Read state with `store.foo`, call actions with `store.doSomething()`. Writes (`store.foo = x` or `this.foo = x` inside an action) trigger re-renders on subscribed components only.

## Your first store

```ts
// stores/counter.ts
import { defineStore } from '@byrding/react'

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

## Publishing a new version

Create a version tag — the Actions workflow publishes to both npm and JSR automatically:

```bash
git tag v0.1.0
git push --tags
```

> **Prerequisite** — set up once:
> 1. Claim `@byrding` org on [npmjs.com](https://www.npmjs.com/org/create) and [jsr.io](https://jsr.io/new).
> 2. Add `NPM_TOKEN` secret to GitHub repo → Settings → Secrets → Actions.
> 3. Enable GitHub Actions publishing on jsr.io for each package (`@byrding/core`, `@byrding/react`, `@byrding/vue`).

Next: [Defining stores](./defining-stores) walks through the two definition styles and their tradeoffs.
