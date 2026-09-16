---
"@byrding/core": minor
---

Add `disposeStore(id)` — a **development and test facility** that tears down a registered store so the next `createStore(id)` starts fresh from whatever definition it is given: runs the registering core's global `onDispose` hooks and the store's per-store plugin `onDispose` hooks, removes its cross-store dep edges in both directions, clears its subscriptions, and deletes the registry entry. Returns `true` when a store was disposed.

**In production (`NODE_ENV === 'production'`) it is a no-op that returns `false`** and leaves the store untouched: stores are first-wins per id and are never replaced in live. Handles obtained before disposal are stale afterwards — this removes a store, it does not swap one in place.

`resetRegistry()` (test-only) now disposes every registered store before clearing, so plugin `onDispose` hooks fire and dep edges are cleaned up in test teardown. `removeStoreDeps` and `CoreStore.runOnDispose`, previously never called, are now exercised by this path.
