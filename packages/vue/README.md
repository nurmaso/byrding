# `@byrding/vue`

A store is a class or a plain object. `defineStore` turns it into a composable. Components subscribe to the key paths they read and re-render only when those change. The same store instance can back React components at the same time through [`@byrding/react`](https://www.npmjs.com/package/@byrding/react) — one live object, no bridge code.

```ts
// stores/counter.ts
import { defineStore } from '@byrding/vue'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})
```

```vue
<script setup lang="ts">
import { useCounterStore } from './stores/counter'
const store = useCounterStore(['count'])   // re-renders only when `count` changes
</script>

<template>
  <button @click="store.increment()">{{ store.count }} × 2 = {{ store.double }}</button>
</template>
```

## Install

```bash
npm install @byrding/vue          # or: pnpm add / yarn add
npx jsr add @byrding/vue          # JSR (TypeScript source)
```

Requires `vue >= 3` and Node ≥ 18 for SSR/tests. Ships ESM and CommonJS with types for both. `@byrding/core` is installed as a dependency; you never import it.

## How it compares

| | `@byrding/vue` | Pinia | Zustand | Valtio | Jotai |
| --- | --- | --- | --- | --- | --- |
| One live store shared by Vue **and** React components | ✅ built in | Vue only | vanilla core; no Vue adapter | vanilla core; no Vue adapter | React only |
| Store shape | class or plain object | options or setup store | `create()` with `set`/`get` | proxy object | atoms |
| Re-render granularity | key paths you declare | Vue reactivity | selectors | accessed-property tracking | per atom |
| Computed values | getters, evaluated on read | cached getters | derive in selectors | `derive` utility | derived atoms |
| Devtools | own extension + `getContext()` | Vue Devtools | Redux DevTools | Redux DevTools | own extension |
| Size, min+gzip | core 4.1 kB + adapter 0.4 kB | | | | |

**What cross-framework sharing buys.** A Vue island and a React island on one page — or a codebase mid-migration — read and write one object, and each side re-renders when the other mutates it. No event bus, no duplicated state.

**What it costs.** Stores are singletons in a module-level registry keyed by a string id (first registration wins; duplicates warn in development), so your bundle must contain exactly one copy of `@byrding/core` (it warns if it finds two). Computed values are not cached. The adapter is thin: no Vue Devtools integration (byrding has its own extension), no `storeToRefs`-style helper beyond Vue's own `toRefs`.

## API

### `defineStore(id, definition, options?)`

```ts
function defineStore<T>(
  id: string,
  definition: (new () => T) | (() => T),
  options?: { core?: CoreStore },
): (keyPaths?: KeyPath<T>[]) => MergedStore<T>
```

Registers the store on first call and returns a composable. Call it once at module level and export the composable. `options.core` runs the store under an isolated plugin host instead of the global one — see [Plugins](https://github.com/nurmaso/byrding/blob/main/docs/guide/plugins.md).

### The composable

```ts
const store = useCounterStore()                 // default: ['*'] — re-render on any change
const store = useCounterStore(['count'])        // only when `count` changes
const store = useCounterStore(['user.name'])    // nested paths; array index / length collapse to the array
```

`keyPaths` is typed against the store: a typo or an action name is a compile error. Build the array in a variable? Type it `KeyPath<T>[]` (from `@byrding/core`) or use `as const`; a plain `string[]` does not type-check.

The return value is a `shallowReactive` object that mirrors the store and is re-synced on every notification, so templates re-render for the properties that changed:

```ts
store.count          // state
store.double         // computed — re-read on each sync
store.increment()    // action — bound to the shared store; stable reference
store.$patch({ count: 1, label: 'x' })   // several keys, one notification
store.$reset()       // back to initial state
```

**Mutate through actions (or `$patch`).** The returned object is a synced *copy*: assigning `store.count = 5` on it updates the copy only, not the shared store, and the next sync overwrites it. This differs from the React hook, whose return value writes through.

Destructuring loses reactivity, as with any `reactive` object — use `toRefs`:

```ts
import { toRefs } from 'vue'
const { count, double } = toRefs(useCounterStore())
```

### Lifecycle

Inside `setup()` the subscription is torn down on `onUnmounted`. Called outside a component (`getCurrentInstance()` is `null`), the subscription lives for the lifetime of the module.

## Things to know

- **Replace arrays; don't mutate them in place.** `items.push(x)` never notifies. Write `store.items = [...store.items, x]`.
- **Nested writes depend on the definition style.** Class stores proxy nested plain objects, so `this.user.name = x` notifies `user.name`. Closure stores instrument only top-level keys, so `store.user.name = x` notifies nothing — replace the object: `store.user = { ...store.user, name: x }`.
- **`defineStore` runs at module level, once.** Not inside `setup()`.
- **Cross-framework sharing** needs the id and the definition exported from one shared file; each adapter wraps them with its own `defineStore`.
- **Devtools.** Register `devtoolsPlugin()` (see [Devtools](https://github.com/nurmaso/byrding/blob/main/docs/guide/devtools.md)); the composable reports the component name from `getCurrentInstance()` and its render count.

## Documentation

[Guide](https://github.com/nurmaso/byrding/tree/main/docs/guide) · [API reference](https://github.com/nurmaso/byrding/blob/main/docs/api/vue.md) · [Internals](https://github.com/nurmaso/byrding/tree/main/docs/internals) · [Changelog](https://github.com/nurmaso/byrding/blob/main/packages/vue/CHANGELOG.md)

Generating code with an AI agent? Point it at the [consumer agent guidance](https://github.com/nurmaso/byrding/blob/main/.claude/docs/byrding-consumer-agent-guidance.md).

MIT
