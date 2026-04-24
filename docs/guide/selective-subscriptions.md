# Selective subscriptions

Each component tells the store **which key paths it cares about**. A mutation only wakes components whose subscription matches.

## The `keyPaths` argument

Both the React hook and the Vue composable take an optional `keyPaths` array:

```ts
useStore()                      // default: ['*'] — re-render on any change
useStore(['count'])             // re-render only when count changes
useStore(['user.name'])         // re-render only when user.name changes
useStore(['count', 'name'])     // re-render when count OR name changes
useStore(['*'])                 // explicit wildcard, same as default
```

The path is a dot-separated chain of property names. Array indices are normalised (`items.0` collapses to `items`), as is `length`.

## Ancestor propagation

A mutation to `user.address.city` wakes any component subscribed to:

- `user.address.city` (exact),
- `user.address` (ancestor),
- `user` (ancestor), or
- `*` (wildcard).

A mutation to `user` does **not** wake components subscribed to `user.address` only — propagation is always parent-upwards, never children-downwards.

## Example

```ts
// stores/demo.ts
class DemoStore {
  count = 0
  name = 'alice'
  description = 'hello'

  increment() { this.count++ }
  rename(n: string) { this.name = n }
  describe(d: string) { this.description = d }
}

export const useDemo = defineStore('demo', DemoStore)
```

```tsx
function CountOnly() {
  const store = useDemo(['count'])   // only re-renders on count changes
  return <p>{store.count}</p>
}

function NameOnly() {
  const store = useDemo(['name'])    // only re-renders on name changes
  return <p>{store.name}</p>
}

function Full() {
  const store = useDemo()             // re-renders on any change
  return <p>{store.count} — {store.name} — {store.description}</p>
}
```

If you click a button that calls `store.increment()`, only `CountOnly` and `Full` re-render. `NameOnly` stays still.

You can see this live in the [render-demo](/examples/render-demo) — each component displays a flashing badge so you can literally watch which ones re-rendered.

## Why this matters

Without selective subscriptions, the usual React pattern is to put state in a common ancestor and drill props down. That forces the ancestor to read everything — which means the ancestor always re-renders — which means without `React.memo` every child also re-renders.

With subscriptions, each leaf connects to the store independently. Intermediate components don't have to touch the data they don't use, and siblings/cousins don't cascade.

## Tradeoffs

- **Key paths are strings.** They aren't checked against your type. Typos won't fail at compile time; they'll just silently subscribe to a path that never changes. TypeScript-safe key paths are a future item.
- **Very fine-grained subscriptions can fragment updates.** If a single logical change mutates five keys, a wildcard subscriber re-renders once; five targeted subscribers re-render once each. Batching is on the roadmap; for now, if you're doing many writes in a loop, consider building up a value and writing once.

Next: [Cross-framework sharing](./cross-framework) — how the same store can power a React and a Vue app simultaneously.
