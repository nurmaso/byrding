# bocal

A tiny reactive store with a vanilla-JS core and thin React + Vue adapters. One store can back components in multiple frameworks at the same time.

## Repo layout

```
bocal/
├── packages/
│   ├── core/                  @bocal/core    — framework-agnostic reactivity
│   ├── react/                 @bocal/react   — useStore hook (useSyncExternalStore)
│   └── vue/                   @bocal/vue     — composable (shallowReactive)
├── playground/                cross-framework code sample — React + Vue share one CartStore
├── render-demo/               re-render visualiser (React)
└── docs/                      VitePress documentation site
```

## Install

```bash
# npm
npm install @bocal/react      # or @bocal/vue / @bocal/core

# JSR (TypeScript source, OIDC-signed provenance)
npx jsr add @bocal/react
```

## Repo quick start (contributing)

This repo uses [pnpm workspaces](https://pnpm.io/workspaces). From the repo root:

```bash
pnpm install

pnpm dev:render-demo     # re-render visualiser on http://localhost:5174
pnpm docs:dev            # docs site (VitePress) on http://localhost:5173
pnpm build               # build all library packages
```

## A taste

```ts
// stores/counter.ts
import { defineStore } from '@bocal/react'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
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

## Documentation

Full guide and API reference in [`docs/`](./docs). Serve locally with `pnpm docs:dev`, or build static HTML with `pnpm docs:build`.

- [Getting started](./docs/guide/getting-started.md)
- [Defining stores](./docs/guide/defining-stores.md) (class vs closure)
- [Selective subscriptions](./docs/guide/selective-subscriptions.md)
- [Cross-framework sharing](./docs/guide/cross-framework.md)
- [`@bocal/core`](./docs/api/core.md) / [`@bocal/react`](./docs/api/react.md) / [`@bocal/vue`](./docs/api/vue.md)

## License

MIT
