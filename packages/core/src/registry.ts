/**
 * registry.ts
 *
 * Module-level singleton map.  All packages that import `@byrding/core` share
 * the same registry instance because Node (and bundlers) resolve a module
 * only once.  This is what makes cross-framework store sharing possible.
 *
 * In Vite dev mode, `import.meta.hot.data` survives module swaps so we
 * restore the same Map reference after an HMR reload — store state, subscriptions,
 * and action bindings are all preserved.  In production `import.meta.hot` is
 * undefined and the code path is identical to before.
 */
import type { StoreInstance } from './types.js';
import { removeStoreDeps } from './subscriptions.js'
import { isDev } from './devWarn.js'

type ViteHot = { readonly data: Record<string, unknown>; accept(cb?: (mod: unknown) => void): void }

/** @internal Extracted for unit-testability without a live Vite dev server. */
export function _buildRegistry(hotData?: Record<string, unknown>): Map<string, StoreInstance> {
  const registry =
    (hotData?.['storeRegistry'] as Map<string, StoreInstance> | undefined)
    ?? new Map<string, StoreInstance>()
  if (hotData) hotData['storeRegistry'] = registry
  return registry
}

const _hot = (import.meta as { hot?: ViteHot }).hot
export const storeRegistry: Map<string, StoreInstance> = _buildRegistry(_hot?.data)

// ─── Disposal ─────────────────────────────────────────────────────────────────
//
// Stores are first-wins per id and, in production, never replaced: a live
// application's store instances are immutable for the life of the page.  The
// two functions below exist for tests and for development-time tooling (HMR)
// only, and `disposeStore` enforces that with an `isDev()` gate.

/**
 * Tear down a registered store in place:
 *   1. run the registering core's global `onDispose` hooks, then the store's
 *      own per-store plugins' `onDispose`;
 *   2. drop its cross-store dep edges in both directions so a later change
 *      upstream cannot notify a dead dependent (or trip cycle detection);
 *   3. clear its subscriptions so a stale handle that still writes to it
 *      cannot fire callbacks; and
 *   4. remove it from the registry.
 *
 * Handles obtained before disposal are stale afterwards — this does not swap
 * a live store, it removes one so the next `createStore(id)` starts fresh.
 */
function _dispose(store: StoreInstance): void {
  store._core.runOnDispose(store.id)
  for (const p of store._localPlugins) p.onDispose?.(store.id)
  removeStoreDeps(store.id)
  store._callbackMap.clear()
  store._updateMap.clear()
  store._snapshotCache = null
  storeRegistry.delete(store.id)
}

/**
 * Dispose the store registered under `id` so a subsequent `createStore(id)`
 * registers a fresh instance from whatever definition it is given.
 *
 * **Development and tests only.** When `NODE_ENV === 'production'` this is a
 * no-op that returns `false` and leaves the store untouched — first
 * registration wins for the life of the page, and stores are never replaced
 * in live.  Returns `false` also when no store is registered under `id`.
 */
export function disposeStore(id: string): boolean {
  if (!isDev()) return false
  const store = storeRegistry.get(id)
  if (!store) return false
  _dispose(store)
  return true
}

/**
 * @testonly Disposes every registered store (plugin `onDispose` hooks fire,
 * dep edges and subscriptions are cleared) and empties the registry.  Call in
 * `beforeEach` to prevent state leaking between tests.
 */
export function resetRegistry(): void {
  for (const store of [...storeRegistry.values()]) {
    // `registry.test.ts` seeds the Map with bare stubs to exercise the Map
    // itself.  Every instance `createStore` registers carries `_core`, so its
    // presence is the discriminator for "run the disposal hooks".
    if (store._core) _dispose(store)
  }
  storeRegistry.clear()
}
