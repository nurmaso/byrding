import { storeRegistry } from './registry.js'
import { VERSION } from './version.js'

export interface ByrdingStoreContext {
  state: Record<string, unknown>
  stateSchema: Record<string, string>
  actions: string[]
  computed: Record<string, unknown>
  subscriberCount: number
}

export interface ByrdingContext {
  version: string
  timestamp: string
  stores: Record<string, ByrdingStoreContext>
}

export function getContext(): ByrdingContext {
  const stores: Record<string, ByrdingStoreContext> = {}

  for (const [id, store] of storeRegistry.entries()) {
    const state: Record<string, unknown> = { ...store._raw }

    const stateSchema: Record<string, string> = {}
    for (const key of store._stateKeys) {
      stateSchema[key] = typeof store._raw[key]
    }

    const computed: Record<string, unknown> = {}
    for (const key of store._computedKeys) {
      try {
        computed[key] = store._getterFns[key]()
      } catch {
        computed[key] = null
      }
    }

    stores[id] = {
      state,
      stateSchema,
      actions: [...store._actionKeys],
      computed,
      subscriberCount: store._callbackMap.size,
    }
  }

  return {
    // Baked in at build time from package.json — see scripts/generate-version.mjs.
    version: VERSION,
    timestamp: new Date().toISOString(),
    stores,
  }
}
