# `@bocal/react`

React adapter. Turns a store definition into a React hook.

## `defineStore(id, definition)`

```ts
function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
): (keyPaths?: string[]) => T
```

Returns a hook. The hook can be called inside any React component.

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

## Using the hook

```tsx
// full subscription — re-renders on any mutation
const store = useCounterStore()

// selective subscription — re-renders only when count changes
const store = useCounterStore(['count'])
```

The return value is the live merged store object:

```ts
store.count         // number  — live read
store.double        // number  — getter called per read
store.increment()   // void    — action
store.count = 10    // allowed — triggers notification
```

Action references are stable across re-renders. Passing `store.increment` as a prop or `onClick` handler is safe and does not cause spurious re-renders.

## How it works

The hook is built on `useSyncExternalStore`:

```ts
useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
```

- `subscribe` is stabilised with `useRef` — a new function identity on every render would cause an infinite re-subscribe loop.
- `getSnapshot` returns a cached plain object (shallow copy of `_raw`). The cache is invalidated on every mutation, so React sees a fresh reference and schedules a re-render.
- After the render, the component reads **live** values from the returned merged store — so computed getters always return the current value, even if the snapshot only carries raw state.

## Component ID

Each component instance is assigned a stable `componentId` (`bocal_NN`) on first render, stored in a `useRef`. This is what the core's subscription map uses to route notifications. You never see it.

## Typing

`defineStore<T>` infers `T` from the definition:

```ts
const useCounterStore = defineStore('counter', class {
  count = 0
  increment() { this.count++ }
})
// => (keyPaths?: string[]) => { count: number; increment: () => void }
```

TypeScript sees all fields on `T`. `keyPaths` is currently typed as `string[]` — narrow-typed key paths are a future enhancement.

## Peer dependencies

- `react >= 18` (needs `useSyncExternalStore`)
