---
"@byrding/core": minor
---

Add cross-store reactive subscriptions and cycle detection (#82).

Computed getters that read another store via `useStore()` now automatically
re-notify their own subscribers when the upstream store changes. A DFS
in-stack cycle guard detects circular reactive dependencies between stores and
throws `ByrdingCycleError` before the call stack overflows.

New exports: `ByrdingCycleError`, `storeDepEdges`, `registerCrossStoreDep`,
`removeStoreDeps`, `resetDepEdges`, `notifyCrossStoreDeps`.
