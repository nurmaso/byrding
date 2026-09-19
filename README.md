# byrding

A small reactive store with a vanilla-JS core and thin React and Vue adapters. Write a store as a class or a plain object; components subscribe to the key paths they read and re-render only when those change. **One store instance can back React and Vue components at the same time** — the registry lives in the core, so both adapters share it.

```ts
// stores/counter.ts
import { defineStore } from '@byrding/react'   // or '@byrding/vue'

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
function Counter() {
  const store = useCounterStore(['count'])   // re-renders only when `count` changes
  return <button onClick={store.increment}>{store.count} × 2 = {store.double}</button>
}
```

## Packages

| Package | Install | Size (min+gzip) | What it is |
| --- | --- | --- | --- |
| [`@byrding/react`](./packages/react) | `npm i @byrding/react` | 0.6 kB + core | `defineStore` → React hook (`useSyncExternalStore`) |
| [`@byrding/vue`](./packages/vue) | `npm i @byrding/vue` | 0.4 kB + core | `defineStore` → Vue 3 composable (`shallowReactive`) |
| [`@byrding/core`](./packages/core) | installed by the adapters | 4.1 kB | registry, reactivity, subscriptions, plugins — use directly from vanilla JS or to write an adapter |
| [`@byrding/plugin-persist`](./packages/plugin-persist) | `npm i @byrding/plugin-persist` | 0.5 kB | localStorage / sessionStorage persistence plugin |
| [`@byrding/vite`](./packages/vite) | `npm i -D @byrding/vite` | — | dev-server plugin that dumps `getContext()` to `.byrding-context.json` for LLM tooling |
| [devtools extension](./packages/devtools-extension) | load unpacked | — | Chrome DevTools panel |

All published packages ship ESM and CommonJS with types, need Node ≥ 18, and are also on [JSR](https://jsr.io/@byrding) (`npx jsr add @byrding/react`).

## How it compares

| | byrding | Zustand | Valtio | Jotai | Pinia |
| --- | --- | --- | --- | --- | --- |
| One live store shared by React **and** Vue | ✅ | vanilla core; no Vue adapter | vanilla core; no Vue adapter | React only | Vue only |
| Store shape | class or plain object | `create()` with `set`/`get` | proxy object | atoms | options / setup store |
| Re-render granularity | key paths you declare | selectors | accessed-property tracking | per atom | Vue reactivity |
| Computed | getters, evaluated on read | in selectors | `derive` | derived atoms | cached getters |

**What sharing buys:** a React island and a Vue island — or an app mid-migration — read and write one object, and each side re-renders when the other mutates it. **What it costs:** stores are singletons keyed by a string id in a module-level registry (first registration wins; one copy of core per bundle, enforced with a dev warning), computed values are not cached, and the adapters are deliberately thin — byrding has its own devtools rather than integrating with each framework's.

## Documentation

- [Getting started](./docs/guide/getting-started.md) · [Defining stores](./docs/guide/defining-stores.md) · [Selective subscriptions](./docs/guide/selective-subscriptions.md) · [Cross-framework sharing](./docs/guide/cross-framework.md)
- [Plugins](./docs/guide/plugins.md) · [Composing stores](./docs/guide/composing-stores.md) · [Devtools](./docs/guide/devtools.md)
- API: [`@byrding/core`](./docs/api/core.md) · [`@byrding/react`](./docs/api/react.md) · [`@byrding/vue`](./docs/api/vue.md)
- [Internals](./docs/internals/architecture.md) — how the registry, reactivity and adapters fit together

Serve the docs locally with `pnpm docs:dev`.

## For AI agents

Generating code that **uses** byrding: [consumer agent guidance](./.claude/docs/byrding-consumer-agent-guidance.md). Modifying the library: [refactor agent guidance](./.claude/docs/byrding-refactor-agent-guidance.md) and [`CLAUDE.md`](./CLAUDE.md).

## Contributing

pnpm workspace. From the root:

```bash
pnpm install
pnpm build          # tsup: ESM + CJS + types for every package
pnpm test           # vitest in every package, including the type tests
pnpm typecheck      # tsc --noEmit in every package
pnpm smoke          # import (ESM) and require (CJS) the built artifacts
pnpm dev:render-demo   # re-render visualiser — http://localhost:5174
```

```
packages/   core · react · vue · plugin-persist · vite · devtools-extension
playground/ React + Vue on one page sharing a CartStore
render-demo/ selective-subscription re-render visualiser
smoke/      ESM/CJS consumption tests
docs/       VitePress site
```

Every change to a published package needs a changeset (`pnpm changeset`; `pnpm changeset --empty` for no-release changes) — CI enforces it. Releases are cut by merging the bot's "Version Packages" PR; see `CLAUDE.md`.

## License

MIT
