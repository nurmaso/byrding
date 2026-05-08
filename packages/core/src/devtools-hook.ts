/**
 * devtools-hook.ts
 *
 * Installs `window.__BYRDING_DEVTOOLS__` in non-production environments.
 * The devtools panel connects to this hook to receive store events.
 * Framework adapters emit component lifecycle events through the same hook.
 *
 * Only active in browser environments (`window` must be defined).
 * A no-op when no devtools panel is connected.
 */

// ─── Event payloads ──────────────────────────────────────────────────────────

export interface DevtoolsStoreInit {
  type: 'store:init'
  storeId: string
  state: Record<string, unknown>
  stateKeys: string[]
  actionKeys: string[]
  computedKeys: string[]
  timestamp: number
}

export interface DevtoolsStateChange {
  type: 'state:change'
  storeId: string
  keyPath: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

export interface DevtoolsActionBefore {
  type: 'action:before'
  storeId: string
  action: string
  args: unknown[]
  timestamp: number
}

export interface DevtoolsActionAfter {
  type: 'action:after'
  storeId: string
  action: string
  args: unknown[]
  result: unknown
  durationMs: number
  timestamp: number
}

export interface DevtoolsComponentMounted {
  type: 'component:mounted'
  componentId: string
  name: string
  framework: 'react' | 'vue'
  storeId: string
  keyPaths: string[]
  timestamp: number
}

export interface DevtoolsComponentUnmounted {
  type: 'component:unmounted'
  componentId: string
  storeId: string
  timestamp: number
}

export interface DevtoolsComponentRendered {
  type: 'component:rendered'
  componentId: string
  name: string
  storeId: string
  renderCount: number
  timestamp: number
}

export type DevtoolsEvent =
  | DevtoolsStoreInit
  | DevtoolsStateChange
  | DevtoolsActionBefore
  | DevtoolsActionAfter
  | DevtoolsComponentMounted
  | DevtoolsComponentUnmounted
  | DevtoolsComponentRendered

// ─── Hook interface ───────────────────────────────────────────────────────────

export interface ByrdingDevtoolsHook {
  emit(event: DevtoolsEvent): void
  on(handler: (event: DevtoolsEvent) => void): () => void
}

type DevtoolsWindow = typeof globalThis & { __BYRDING_DEVTOOLS__?: ByrdingDevtoolsHook }

// ─── Install / access ─────────────────────────────────────────────────────────

function createHook(): ByrdingDevtoolsHook {
  const handlers = new Set<(event: DevtoolsEvent) => void>()
  return {
    emit(event) {
      handlers.forEach((h) => h(event))
    },
    on(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
  }
}

/**
 * Install the global hook. Safe to call multiple times — subsequent calls
 * are no-ops. Called automatically at `@byrding/core` module load time.
 */
export function installDevtoolsHook(): void {
  if (typeof window === 'undefined') return
  const w = window as DevtoolsWindow
  if (w.__BYRDING_DEVTOOLS__) return
  w.__BYRDING_DEVTOOLS__ = createHook()
}

/**
 * Returns the installed hook, or `null` if running in production or on the
 * server. Framework adapters use this to emit component events.
 */
export function getDevtoolsHook(): ByrdingDevtoolsHook | null {
  if (typeof window === 'undefined') return null
  return (window as DevtoolsWindow).__BYRDING_DEVTOOLS__ ?? null
}
