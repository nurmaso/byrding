/**
 * instanceGuard.ts
 *
 * Detects a second copy of @byrding/core initialising in the same runtime.
 *
 * Cross-framework sharing works because `storeRegistry` is a module-level
 * singleton — every package that imports `@byrding/core` gets the same Map.
 * That holds only while the bundler resolves ONE copy of core.  If
 * `@byrding/react` and `@byrding/vue` (or a plugin) end up depending on
 * different versions, the package manager installs two copies, each with its
 * own registry: stores defined through one are invisible to the other and
 * sharing silently breaks — the worst failure mode for the library's headline
 * feature, and invisible without this check.
 *
 * On first initialisation we stamp `globalThis` under a `Symbol.for` key (a
 * global-symbol-registry key, so a *different* copy of this module computes
 * the same key).  A later initialisation that finds the stamp is a second
 * copy and warns.  Development only — production skips the check entirely.
 *
 * Vite HMR re-evaluates this module when core source is edited; that is the
 * same copy, not a second one.  `import.meta.hot.data` survives the swap, so
 * a marker stored there tells the two cases apart.
 */

import { VERSION } from './version.js'
import { devWarn, isDev } from './devWarn.js'

const GLOBAL_KEY = Symbol.for('byrding.core.instance')
const HOT_KEY = 'byrdingInstanceGuard'

type GuardGlobal = typeof globalThis & { [GLOBAL_KEY]?: { version: string } }

/**
 * Called once from `registry.ts` at module initialisation.  Exported for
 * unit-testability; `hotData` is `import.meta.hot?.data` when running under
 * Vite dev.
 */
export function checkSingleInstance(hotData?: Record<string, unknown>): void {
  if (!isDev()) return

  if (hotData?.[HOT_KEY]) return
  if (hotData) hotData[HOT_KEY] = true

  const g = globalThis as GuardGlobal
  const existing = g[GLOBAL_KEY]
  if (existing) {
    devWarn(
      `Two copies of @byrding/core are loaded (already initialised: ${existing.version}; this copy: ${VERSION}). ` +
      `Each copy has its own store registry, so stores defined through one copy are invisible to the other and ` +
      `cross-framework sharing silently breaks. Make sure @byrding/react, @byrding/vue and any plugins resolve ` +
      `the same @byrding/core — check with \`pnpm why @byrding/core\` or \`npm ls @byrding/core\`.`,
    )
    return
  }

  g[GLOBAL_KEY] = { version: VERSION }
}

/** @testonly Remove the globalThis stamp so the next `checkSingleInstance` counts as first. */
export function _resetInstanceGuard(): void {
  delete (globalThis as GuardGlobal)[GLOBAL_KEY]
}
