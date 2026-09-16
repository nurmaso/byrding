---
"@byrding/core": patch
---

Warn in development when `createStore` is called for an already-registered id with a **different** definition reference. The registry is first-wins per id and the later definition has always been silently discarded; that silence bites in tests that forget `resetRegistry()` and under Vite HMR when a definition is edited but never takes effect. Passing the same function reference again — the normal path when `@byrding/react` and `@byrding/vue` both register one exported definition, or on an HMR re-evaluation of an unchanged module — stays silent. The warning is emitted once per id via `devWarn` and is a no-op when `NODE_ENV === 'production'`. Internal: `StoreInstance` gains a `_definition` field holding the registering reference.
