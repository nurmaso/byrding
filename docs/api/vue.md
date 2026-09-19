# `@byrding/vue`

Vue 3 adapter: `defineStore` returns a composable backed by `shallowReactive`. Package README: [`packages/vue`](https://github.com/nurmaso/byrding/tree/main/packages/vue).

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

Calls core's [`createStore`](./core#createstore-id-definition-options) (first registration wins) and returns a composable. Call it once, at module level, and export the composable. `options.core` is passed straight through — see [Plugins](../guide/plugins#isolated-plugin-hosts).

## The composable

```ts
const store = useCounterStore()                 // ['*'] — re-render on any change
const store = useCounterStore(['count'])        // only when `count` (or a descendant) changes
```

`keyPaths` must be [`KeyPath<T>[]`](./core#keypath-t): `'*'`, a state or computed key, or a dotted path under one. A typo or an action name is a compile error; a plain `string[]` variable does not type-check.

### Return value

A `shallowReactive` object created by spreading the core's merged store, so it holds the current state values, the current computed values, and the (stable) action functions. On every notification that matches `keyPaths` the composable re-syncs it with `Object.assign(reactiveStore, storeHandle.store)`; Vue then re-renders whatever read the properties that changed value.

| Access | Effect |
| --- | --- |
| `store.count` | current value (as of the last sync) |
| `store.double` | computed value re-read at each sync |
| `store.increment()` | action bound to the **shared** store; notifies everyone |
| `store.$patch({ … })` | multi-key write on the shared store, one notification |
| `store.$reset()` | restore initial state |
| `store.count = 5` | **writes the local copy only** — the shared store is unchanged and the next sync overwrites it |

Mutate through actions or `$patch`. This is the one behavioural difference from the React hook, whose return value writes through to the store.

Destructuring loses reactivity, like any `reactive` object:

```ts
import { toRefs } from 'vue'
const { count, double } = toRefs(useCounterStore())
```

### Lifecycle

Inside `setup()` (i.e. `getCurrentInstance()` is non-null) the subscription is removed on `onUnmounted`. Outside a component the subscription lives as long as the module.

## Devtools events

When `window.__BYRDING_DEVTOOLS__` is present (see [Devtools](../guide/devtools)), the composable emits `component:mounted`, `component:rendered` (with a running `renderCount`) and `component:unmounted`. The component name comes from `getCurrentInstance()` (`__name`, then `name`), falling back to the `componentId`.

## Hot module replacement

The adapter module self-accepts under Vite, and core keeps the registry across hot updates. Editing a **store definition** does not take effect until reload (first registration wins; a dev warning says so).

## Peer dependencies

- `vue >= 3`
