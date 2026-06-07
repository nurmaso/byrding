import { storeRegistry } from '@byrding/core'
import type { Plugin } from '@byrding/core'

export interface PersistPluginOptions {
  /** Keys to persist. Omit to persist all state keys present in the init snapshot. */
  keys?: string[]
  /** Storage backend. Defaults to localStorage. */
  storage?: Storage
  /** Storage key prefix. Defaults to `byrding:<storeId>`. */
  prefix?: string
  /** Serialize value before write. Defaults to JSON.stringify. */
  serialize?: (value: unknown) => string
  /** Deserialize value on rehydration. Defaults to JSON.parse. */
  deserialize?: (raw: string) => unknown
  /**
   * Store ID allowlist. Required when registered as a global plugin via
   * configureByrding(). Omit when registered per-store — the plugin is
   * already scoped by the store definition.
   */
  stores?: string[]
}

function getDefaultStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function persistPlugin(options: PersistPluginOptions = {}): Plugin {
  const {
    keys,
    prefix,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    stores,
  } = options

  function resolveStorage(): Storage | null {
    if (options.storage) return options.storage
    return getDefaultStorage()
  }

  function storageKey(storeId: string, key: string): string {
    const p = prefix ?? `byrding:${storeId}`
    return `${p}:${key}`
  }

  return {
    onInit(storeId, snapshot) {
      if (stores && !stores.includes(storeId)) return

      const storage = resolveStorage()
      if (!storage) return

      const storeInst = storeRegistry.get(storeId)
      if (!storeInst) return

      const raw = storeInst._raw as Record<string, unknown>
      const keysToRehydrate = keys ?? Object.keys(snapshot)

      for (const key of keysToRehydrate) {
        if (!Object.prototype.hasOwnProperty.call(raw, key)) continue

        let rawVal: string | null
        try {
          rawVal = storage.getItem(storageKey(storeId, key))
        } catch {
          continue
        }
        if (rawVal === null) continue

        let value: unknown
        try {
          value = deserialize(rawVal)
        } catch {
          continue
        }

        // Write directly to _raw to bypass the proxy and avoid triggering
        // onStateChange during init — rehydration must be silent.
        raw[key] = value
      }
    },

    onStateChange(storeId, path, next) {
      if (stores && !stores.includes(storeId)) return
      if (keys && !keys.includes(path)) return

      const storage = resolveStorage()
      if (!storage) return

      try {
        storage.setItem(storageKey(storeId, path), serialize(next))
      } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.warn(`[byrding:plugin-persist] Storage quota exceeded writing "${storageKey(storeId, path)}"`)
        }
      }
    },
  }
}
