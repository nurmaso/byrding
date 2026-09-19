# `@byrding/react`

React adapter: `defineStore` returns a hook built on `useSyncExternalStore`. Package README: [`packages/react`](https://github.com/nurmaso/byrding/tree/main/packages/react).

[[toc]]

## `defineStore(id, definition, options?)`

```ts
function defineStore<C extends new () => object>(
  id: string, definition: C, options?: { core?: CoreStore },
): (keyPaths?: KeyPath<InstanceType<C>>[]) => MergedStore<StateOf<InstanceType<C>>, ActionsOf<InstanceType<C>>>

function defineStore<T extends Record<string, unknown>>(
  id: string, definition: () => T, options?: { core?: CoreStore },
): (keyPaths?: KeyPath<T>[]) => MergedStore<StateOf<T>, ActionsOf<T>>
```

Calls core's [`createStore`](./core#createstore-id-definition-options) (first registration wins) and returns a hook. Call it once, at module level, and export the hook. `options.core` is passed straight through — see [Plugins](../guide/plugins#isolated-plugin-hosts).

## The hook

```tsx
const store = useCounterStore()                 // ['*'] — re-render on any change
const store = useCounterStore(['count'])        // only when `count` (or a descendant) changes
const store = useCounterStore(['user.name', 'items'])
```

`keyPaths` must be [`KeyPath<T>[]`](./core#keypath-t): `'*'`, a state or computed key, or a dotted path under one. A typo or an action name is a compile error; a plain `string[]` variable does not type-check.

### Return value

The **live** merged store from core — the same object every component and every adapter sees:

| Access | Effect |
| --- | --- |
| `store.count` | live read |
| `store.double` | computed getter runs now |
| `store.increment()` | action; reference is stable across renders and adapters |
| `store.count = 10` | direct write; notifies subscribers of `count` |
| `store.$patch({ … })` | multi-key write, one notification |
| `store.$reset()` | restore initial state |

Destructuring copies values at render time: `const { count, increment } = useCounterStore()` keeps `increment` usable but `count` is a snapshot.

### Subscription and re-rendering

- The hook assigns a stable `componentId` (`byrding_N`) on first render and subscribes once with a `subscribe` function kept in a `useRef` — `useSyncExternalStore` requires a referentially stable `subscribe`.
- Re-rendering is driven by `getSnapshot()`, a cached shallow copy of raw state whose reference changes only when something changed. Computed values are not in the snapshot; they are re-evaluated from the live store during render.
- Both `getSnapshot` and `getServerSnapshot` are the same function; there is no server-specific snapshot handling.
- Unmount unsubscribes.

## Devtools events

When `window.__BYRDING_DEVTOOLS__` is present (see [Devtools](../guide/devtools)), the hook emits `component:mounted` (with `name`, `componentId`, `storeId`, `keyPaths`), `component:rendered` (with a running `renderCount`) and `component:unmounted`.

The component **name** is inferred from the call stack on first render — the first PascalCase function or file name — so devtools can label components without configuration. That inference only runs when `process.env.NODE_ENV !== 'production'`; bundlers that replace `NODE_ENV` drop it from production builds, where the name falls back to the `componentId`.

## `@byrding/react/testing`

```ts
import { renderStore } from '@byrding/react/testing'

const { result, act, rerender, unmount } = renderStore(useCounterStore)
await act(() => { result.current.increment() })
expect(result.current.count).toBe(1)
```

`renderStore(useStore)` wraps `renderHook` from `@testing-library/react` and returns its `result`, `rerender` and `unmount` plus an `act` that accepts sync or async callbacks. `@testing-library/react` is an optional peer dependency — install it in your project.

Reset the registry between tests (`resetRegistry()` from `@byrding/core`) or store ids leak across test files.

## Hot module replacement

The adapter module self-accepts under Vite, and core keeps the registry across hot updates, so state survives edits to components. Editing a **store definition** does not take effect until reload (first registration wins; a dev warning says so).

## Peer dependencies

- `react >= 18`
- `@testing-library/react` (optional; only for `./testing`)
