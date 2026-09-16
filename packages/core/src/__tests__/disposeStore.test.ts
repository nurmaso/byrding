import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStore, generateComponentId } from '../createStore.js'
import { storeRegistry, resetRegistry, disposeStore } from '../registry.js'
import { resetDepEdges, storeDepEdges } from '../subscriptions.js'
import { CoreStore, coreStore, configureByrding } from '../coreStore.js'
import { resetDevWarnings } from '../devWarn.js'
import type { Plugin, UseStoreFn } from '../types.js'

// `disposeStore` is a development / test facility.  In production builds it
// is a no-op: stores are first-wins and are never replaced in live.

function resetGlobalCore() {
  const c = coreStore as unknown as { _plugins: Plugin[]; _initialized: boolean }
  c._plugins.length = 0
  c._initialized = false
}

beforeEach(() => {
  resetRegistry()
  resetDepEdges()
  resetGlobalCore()
  resetDevWarnings()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const counterDef = () => {
  const store = { count: 0, increment() { store.count++ } }
  return store
}

describe('disposeStore', () => {
  test('removes the registry entry and returns true', () => {
    createStore('dispose-basic', counterDef)
    expect(storeRegistry.has('dispose-basic')).toBe(true)

    expect(disposeStore('dispose-basic')).toBe(true)
    expect(storeRegistry.has('dispose-basic')).toBe(false)
  })

  test('returns false for an unregistered id and fires no hooks', () => {
    const plugin: Plugin = { onDispose: vi.fn() }
    configureByrding({ plugins: [plugin] })
    expect(disposeStore('never-registered')).toBe(false)
    expect(plugin.onDispose).not.toHaveBeenCalled()
  })

  test('fires the registering core\'s onDispose and per-store onDispose exactly once', () => {
    const globalPlugin: Plugin = { onDispose: vi.fn() }
    const localPlugin: Plugin = { onDispose: vi.fn() }
    const core = new CoreStore({ plugins: [globalPlugin] })
    class Counter {
      static plugins = [localPlugin]
      count = 0
    }

    createStore('dispose-hooks', Counter, { core })
    createStore('dispose-hooks', Counter, { core })
    disposeStore('dispose-hooks')

    expect(globalPlugin.onDispose).toHaveBeenCalledTimes(1)
    expect(globalPlugin.onDispose).toHaveBeenCalledWith('dispose-hooks')
    expect(localPlugin.onDispose).toHaveBeenCalledTimes(1)
    expect(localPlugin.onDispose).toHaveBeenCalledWith('dispose-hooks')
  })

  test('a fresh createStore for the same id takes the new definition without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = createStore('dispose-reregister', counterDef)
    first.store.increment()
    expect(first.store.count).toBe(1)

    disposeStore('dispose-reregister')
    const second = createStore('dispose-reregister', () => {
      const store = { count: 100, increment() { store.count += 10 } }
      return store
    })

    expect(second.store.count).toBe(100)
    second.store.increment()
    expect(second.store.count).toBe(110)
    expect(warn).not.toHaveBeenCalled()
  })

  test('clears subscriptions so a stale handle no longer notifies', () => {
    const handle = createStore('dispose-subs', counterDef)
    const cb = vi.fn()
    handle.subscribe(generateComponentId(), ['*'], cb)

    handle.store.increment()
    expect(cb).toHaveBeenCalledTimes(1)

    disposeStore('dispose-subs')
    handle.store.increment()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('removes cross-store dep edges in both directions', () => {
    const upstream = createStore('dispose-up', counterDef)
    const dependent = createStore('dispose-dep', (useStore: UseStoreFn) => {
      const up = useStore<{ count: number }>('dispose-up')
      return { get doubled() { return up.count * 2 } }
    })
    expect(dependent.store.doubled).toBe(0)
    expect(storeDepEdges.get('dispose-up')?.has('dispose-dep')).toBe(true)

    const cb = vi.fn()
    dependent.subscribe(generateComponentId(), ['*'], cb)

    disposeStore('dispose-dep')

    expect(storeDepEdges.get('dispose-up')?.has('dispose-dep') ?? false).toBe(false)
    upstream.store.increment()
    expect(cb).not.toHaveBeenCalled()

    // Disposing the upstream drops its outgoing edge set entirely.
    createStore('dispose-dep2', (useStore: UseStoreFn) => {
      const up = useStore<{ count: number }>('dispose-up')
      return { get doubled() { return up.count * 2 } }
    })
    disposeStore('dispose-up')
    expect(storeDepEdges.has('dispose-up')).toBe(false)
  })

  test('production: no-op, returns false, store and hooks untouched', () => {
    const plugin: Plugin = { onDispose: vi.fn() }
    configureByrding({ plugins: [plugin] })
    const handle = createStore('dispose-prod', counterDef)
    handle.store.increment()

    vi.stubEnv('NODE_ENV', 'production')

    expect(disposeStore('dispose-prod')).toBe(false)
    expect(storeRegistry.has('dispose-prod')).toBe(true)
    expect(plugin.onDispose).not.toHaveBeenCalled()

    // First-wins still holds: a new definition is ignored.
    const again = createStore('dispose-prod', () => ({ count: 999 }))
    expect(again.store.count).toBe(1)
  })
})

describe('resetRegistry', () => {
  test('disposes every registered store: onDispose fires once per store and dep edges are cleared', () => {
    const plugin: Plugin = { onDispose: vi.fn() }
    configureByrding({ plugins: [plugin] })

    createStore('reset-a', counterDef)
    createStore('reset-b', (useStore: UseStoreFn) => {
      const a = useStore<{ count: number }>('reset-a')
      return { get doubled() { return a.count * 2 } }
    })
    expect(storeRegistry.get('reset-b')).toBeDefined()
    void createStore('reset-b', counterDef).store.doubled
    expect(storeDepEdges.get('reset-a')?.has('reset-b')).toBe(true)

    resetRegistry()

    expect(storeRegistry.size).toBe(0)
    expect(plugin.onDispose).toHaveBeenCalledTimes(2)
    expect(plugin.onDispose).toHaveBeenCalledWith('reset-a')
    expect(plugin.onDispose).toHaveBeenCalledWith('reset-b')
    expect(storeDepEdges.get('reset-a')?.has('reset-b') ?? false).toBe(false)
  })
})
