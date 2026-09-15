---
"@byrding/core": minor
---

Instrument each store exactly once per id. `createStore` is called once per framework adapter and again on every Vite HMR re-evaluation; previously the `_notify` wrapper, the `onAction` wrapper, and the snapshot cache were re-applied on every call, so a store used from both React and Vue was instrumented twice. Fixes four consequences of that:

- Global (`configureByrding`) and per-store (`plugins`) `onStateChange` / `onAction` hooks fired once per handle instead of once per mutation / action.
- `$patch` through one handle did not invalidate another handle's snapshot, so a `$patch` from Vue left React's `useSyncExternalStore` holding a stale reference and the component did not re-render.
- Cross-store propagation (`_propagate` in `subscriptions.ts`) bypassed the snapshot-cache invalidation, so a React component reading only computed values derived from another store via `useStore()` never re-rendered when the upstream changed.
- Action references differed between handles, contradicting the documented stable-reference guarantee.

The snapshot cache and the registering `CoreStore` now live on `StoreInstance` (`_snapshotCache`, `_core`) so all handles share them. A later `createStore` call for an already-registered id that resolves a different `options.core` now warns once in development (first registration wins; the warning is a no-op when `NODE_ENV === 'production'`).

New exports: `devWarn`, `isDev`, `resetDevWarnings` (dev-only diagnostics helper) and the `StoreCoreHooks` type. No public API changes to `createStore`, `StoreHandle`, or the framework adapters.
