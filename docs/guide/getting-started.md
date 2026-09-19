# Getting started

`byrding` is a monorepo. The published packages:

| Package | What it is |
| --- | --- |
| `@byrding/react` | `defineStore` → React hook (`useSyncExternalStore`) |
| `@byrding/vue` | `defineStore` → Vue 3 composable (`shallowReactive`) |
| `@byrding/core` | the framework-agnostic engine both adapters depend on; use it directly from vanilla JS |
| `@byrding/plugin-persist` | localStorage / sessionStorage persistence plugin |
| `@byrding/vite` | dev-server plugin that writes `getContext()` to `.byrding-context.json` |

Plus a Chrome devtools extension (`packages/devtools-extension`), a cross-framework `playground/`, a `render-demo/` visualiser, and this site. All packages ship ESM and CommonJS with types and need Node ≥ 18.

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
git clone https://github.com/nurmaso/byrding.git
cd byrding
pnpm install
pnpm build        # tsup — ESM + CJS + types for every package
pnpm test         # vitest in every package, including the type tests
pnpm typecheck    # tsc --noEmit in every package
pnpm smoke        # import (ESM) and require (CJS) the built artifacts
```

## Run the demos

```bash
pnpm dev:render-demo   # re-render visualiser on http://localhost:5174
```

The [`playground/`](https://github.com/nurmaso/byrding/tree/main/playground) directory shows the same `CartStore` wired into a React tree and a Vue tree on one page.

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

Releases are driven by [changesets](https://github.com/changesets/changesets). Every change to a published package needs a `.changeset/*.md` file (`pnpm changeset`, or `pnpm changeset --empty` for a change that needs no release — CI enforces this on PRs). On every push to `main` the release workflow opens or updates a **Version Packages** PR; merging that PR bumps versions, writes changelogs, and publishes to npm and JSR. Details in the repo's `CLAUDE.md`.

Next: [Defining stores](./defining-stores) walks through the two definition styles and their tradeoffs.
