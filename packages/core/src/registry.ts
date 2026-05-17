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

declare global {
  interface ImportMeta {
    readonly hot?: {
      readonly data: Record<string, unknown>
      accept(cb?: (mod: unknown) => void): void
    }
  }
}

/** @internal Extracted for unit-testability without a live Vite dev server. */
export function _buildRegistry(hotData?: Record<string, unknown>): Map<string, StoreInstance> {
  const registry =
    (hotData?.['storeRegistry'] as Map<string, StoreInstance> | undefined)
    ?? new Map<string, StoreInstance>()
  if (hotData) hotData['storeRegistry'] = registry
  return registry
}

export const storeRegistry: Map<string, StoreInstance> = _buildRegistry(import.meta.hot?.data)

/** @testonly Clears all registered stores. Call in beforeEach to prevent state leaking between tests. */
export function resetRegistry(): void {
  storeRegistry.clear()
}
