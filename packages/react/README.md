# `@byrding/react`

A store is a class or a plain object. `defineStore` turns it into a hook. Components subscribe to the key paths they read and re-render only when those change. The same store instance can back Vue components at the same time through [`@byrding/vue`](https://www.npmjs.com/package/@byrding/vue) — one live object, no bridge code.

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

```tsx
function Counter() {
  const store = useCounterStore(['count'])   // re-renders only when `count` changes
  return <button onClick={store.increment}>{store.count} × 2 = {store.double}</button>
}
```

## Install

```bash
npm install @byrding/react        # or: pnpm add / yarn add
npx jsr add @byrding/react        # JSR (TypeScript source)
```

Requires `react >= 18` (uses `useSyncExternalStore`) and Node ≥ 18 for SSR/tests. Ships ESM and CommonJS with types for both. `@byrding/core` is installed as a dependency; you never import it.

## How it compares

| | `@byrding/react` | Zustand | Valtio | Jotai | Pinia |
| --- | --- | --- | --- | --- | --- |
| One live store shared by React **and** Vue components | ✅ built in | vanilla core; no Vue adapter | vanilla core; no Vue adapter | React only | Vue only |
| Store shape | class or plain object | `create()` with `set`/`get` | proxy object | atoms | options or setup store |
| Re-render granularity | key paths you declare | selectors | accessed-property tracking | per atom | Vue reactivity |
| Computed values | getters, evaluated on read | derive in selectors | `derive` utility | derived atoms | cached getters |
| Devtools | own extension + `getContext()` | Redux DevTools | Redux DevTools | own extension | Vue Devtools |
| Size, min+gzip | core 4.1 kB + adapter 0.6 kB | | | | |

**What cross-framework sharing buys.** A React island and a Vue island on one page — or a codebase mid-migration — read and write one object, and each side re-renders when the other mutates it. No event bus, no duplicated state, no adapter you wrote yourself.

**What it costs.** Stores are singletons in a module-level registry keyed by a string id (first registration wins; duplicates warn in development), so your bundle must contain exactly one copy of `@byrding/core` (it warns if it finds two). Computed values are not cached. The adapters are thin, so there is no framework-native devtools panel, Suspense integration, or async helper — byrding has its own devtools extension instead.

## API

### `defineStore(id, definition, options?)`

```ts
function defineStore<T>(
  id: string,
  definition: (new () => T) | (() => T),
  options?: { core?: CoreStore },
): (keyPaths?: KeyPath<T>[]) => MergedStore<T>
```

Registers the store on first call and returns a hook. Call it once at module level and export the hook. `options.core` runs the store under an isolated plugin host instead of the global one — see [Plugins](https://github.com/nurmaso/byrding/blob/main/docs/guide/plugins.md).

### The hook

```ts
const store = useCounterStore()                 // default: ['*'] — re-render on any change
const store = useCounterStore(['count'])        // only when `count` changes
const store = useCounterStore(['user.name'])    // nested paths; array index / length collapse to the array
```

`keyPaths` is typed against the store: a typo or an action name is a compile error. Build the array in a variable? Type it `KeyPath<T>[]` (from `@byrding/core`) or use `as const`; a plain `string[]` does not type-check.

The return value is the **live** merged store, not a snapshot:

```ts
store.count          // state — live read
store.double         // computed — the getter runs on every read
store.increment()    // action — stable reference across renders and across adapters
store.count = 10     // direct write — notifies subscribers
store.$patch({ count: 1, label: 'x' })   // several keys, one notification
store.$reset()       // back to initial state (one notification per changed key)
```

Destructuring copies the values at that moment: `const { count, increment } = useCounterStore()` — `increment` stays valid, `count` is stale after the next change.

### Typing

State, computed and actions are inferred from the definition for both styles. `MergedStore<T>` is the flat object above plus `$patch` and `$reset`.

```ts
class CounterStore { count = 0; increment() { this.count++ } }
const useCounterStore = defineStore('counter', CounterStore)
// (keyPaths?: KeyPath<...>[]) => { count: number; increment(): void; $patch(...): void; $reset(): void }
```

### `@byrding/react/testing`

```ts
import { renderStore } from '@byrding/react/testing'
const { result, act, rerender, unmount } = renderStore(useCounterStore)
await act(() => result.current.increment())
expect(result.current.count).toBe(1)
```

Wraps `renderHook` from `@testing-library/react` (an optional peer dependency — install it yourself).

## Things to know

- **Replace arrays; don't mutate them in place.** `items.push(x)` never notifies. Write `this.items = [...this.items, x]`.
- **Nested writes depend on the definition style.** Class stores proxy nested plain objects, so `this.user.name = x` notifies `user.name`. Closure stores instrument only top-level keys, so `store.user.name = x` notifies nothing — replace the object: `store.user = { ...store.user, name: x }`.
- **`defineStore` runs at module level, once.** Not inside a component.
- **Cross-framework sharing** needs the id and the definition exported from one shared file; each adapter wraps them with its own `defineStore`.
- **Devtools.** Register `devtoolsPlugin()` (see [Devtools](https://github.com/nurmaso/byrding/blob/main/docs/guide/devtools.md)); the hook reports each component's name and render count. In production the name inference is compiled out and the component id is reported instead.

## Documentation

[Guide](https://github.com/nurmaso/byrding/tree/main/docs/guide) · [API reference](https://github.com/nurmaso/byrding/blob/main/docs/api/react.md) · [Internals](https://github.com/nurmaso/byrding/tree/main/docs/internals) · [Changelog](https://github.com/nurmaso/byrding/blob/main/packages/react/CHANGELOG.md)

Generating code with an AI agent? Point it at the [consumer agent guidance](https://github.com/nurmaso/byrding/blob/main/.claude/docs/byrding-consumer-agent-guidance.md).

MIT
