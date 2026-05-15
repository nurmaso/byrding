import { getContext } from './getContext.js'
import type { ByrdingContext } from './getContext.js'
import type { PluginFactory } from './types.js'

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
  getContext(): ByrdingContext
}

type DevtoolsWindow = typeof globalThis & { __BYRDING_DEVTOOLS__?: ByrdingDevtoolsHook }

function createHook(): ByrdingDevtoolsHook {
  const handlers = new Set<(event: DevtoolsEvent) => void>()
  return {
    emit(event) { handlers.forEach((h) => h(event)) },
    on(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    getContext: () => getContext(),
  }
}

export function installDevtoolsHook(): void {
  if (typeof window === 'undefined') return
  const w = window as DevtoolsWindow
  if (w.__BYRDING_DEVTOOLS__) return
  w.__BYRDING_DEVTOOLS__ = createHook()
}

export function getDevtoolsHook(): ByrdingDevtoolsHook | null {
  if (typeof window === 'undefined') return null
  return (window as DevtoolsWindow).__BYRDING_DEVTOOLS__ ?? null
}

// ─── Plugin factory ───────────────────────────────────────────────────────────
//
// Note (v1 gaps):
//   - store:init emits stateKeys derived from the snapshot; actionKeys and
//     computedKeys are unavailable via the Plugin interface and emitted as [].
//   - action:after is not emittable because onAction fires before the action
//     runs and does not receive the return value. Omitted in v1.

export const devtoolsPlugin: PluginFactory = () => {
  installDevtoolsHook()

  return {
    onInit(storeId, snapshot) {
      getDevtoolsHook()?.emit({
        type: 'store:init',
        storeId,
        state: snapshot as Record<string, unknown>,
        stateKeys: Object.keys(snapshot),
        actionKeys: [],
        computedKeys: [],
        timestamp: Date.now(),
      })
    },

    onStateChange(storeId, path, next, prev) {
      getDevtoolsHook()?.emit({
        type: 'state:change',
        storeId,
        keyPath: path,
        newValue: next,
        oldValue: prev,
        timestamp: Date.now(),
      })
    },

    onAction(storeId, actionName, args) {
      getDevtoolsHook()?.emit({
        type: 'action:before',
        storeId,
        action: actionName,
        args,
        timestamp: Date.now(),
      })
    },
  }
}
