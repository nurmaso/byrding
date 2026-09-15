import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStore, generateComponentId } from '../createStore.js'
import { resetRegistry } from '../registry.js'
import { resetDepEdges } from '../subscriptions.js'
import { CoreStore, coreStore, configureByrding } from '../coreStore.js'
import { resetDevWarnings } from '../devWarn.js'
import type { Plugin, UseStoreFn } from '../types.js'

// `createStore` is called once per framework adapter (and once more per Vite
// HMR re-evaluation) for the same id.  Every test below creates two or three
// handles for one id and asserts the store is instrumented exactly once.

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
  vi.restoreAllMocks()
})

const counterDef = () => {
  const store = {
    count: 0,
    increment() { store.count++ },
  }
  return store
}

describe('multiple handles for one id — plugin hooks', () => {
  test('global onStateChange / onAction fire exactly once per mutation / action', () => {
    const plugin: Plugin = { onStateChange: vi.fn(), onAction: vi.fn() }
    configureByrding({ plugins: [plugin] })

    const a = createStore('multi-global', counterDef)
    createStore('multi-global', counterDef)
    createStore('multi-global', counterDef)

    a.store.increment()

    expect(plugin.onAction).toHaveBeenCalledTimes(1)
    expect(plugin.onStateChange).toHaveBeenCalledTimes(1)
    expect(plugin.onStateChange).toHaveBeenCalledWith('multi-global', 'count', 1, 0)
  })

  test('per-store `plugins` hooks fire exactly once — closure style', () => {
    const plugin: Plugin = { onStateChange: vi.fn(), onAction: vi.fn() }
    const def = () => {
      const store = {
        plugins: [plugin],
        count: 0,
        increment() { store.count++ },
      }
      return store
    }

    const a = createStore('multi-local-closure', def)
    createStore('multi-local-closure', def)

    a.store.increment()

    expect(plugin.onAction).toHaveBeenCalledTimes(1)
    expect(plugin.onStateChange).toHaveBeenCalledTimes(1)
  })

  test('per-store `static plugins` hooks fire exactly once — class style', () => {
    const plugin: Plugin = { onStateChange: vi.fn(), onAction: vi.fn() }
    class Counter {
      static plugins = [plugin]
      count = 0
      increment() { this.count++ }
    }

    const a = createStore('multi-local-class', Counter)
    createStore('multi-local-class', Counter)

    a.store.increment()

    expect(plugin.onAction).toHaveBeenCalledTimes(1)
    expect(plugin.onStateChange).toHaveBeenCalledTimes(1)
  })

  test('$patch runs global onStateChange exactly once per changed key', () => {
    const plugin: Plugin = { onStateChange: vi.fn() }
    configureByrding({ plugins: [plugin] })

    createStore('multi-patch-plugin', counterDef)
    const b = createStore('multi-patch-plugin', counterDef)

    b.store.$patch({ count: 7 })

    expect(plugin.onStateChange).toHaveBeenCalledTimes(1)
  })
})

describe('multiple handles for one id — snapshot cache', () => {
  test('getSnapshot() is reference-identical across handles between mutations', () => {
    const a = createStore('multi-snap', counterDef)
    const b = createStore('multi-snap', counterDef)

    const snapA = a.getSnapshot()
    const snapB = b.getSnapshot()
    expect(snapA).toBe(snapB)
    expect(a.getSnapshot()).toBe(snapA)
  })

  test('a mutation through one handle yields a new shared reference on every handle', () => {
    const a = createStore('multi-snap-mut', counterDef)
    const b = createStore('multi-snap-mut', counterDef)

    const before = a.getSnapshot()
    expect(b.getSnapshot()).toBe(before)

    b.store.increment()

    const afterA = a.getSnapshot()
    const afterB = b.getSnapshot()
    expect(afterA).not.toBe(before)
    expect(afterA).toBe(afterB)
    expect(afterA.count).toBe(1)
  })

  test('$patch via handle B invalidates handle A snapshot', () => {
    const a = createStore('multi-snap-patch', counterDef)
    const b = createStore('multi-snap-patch', counterDef)

    const before = a.getSnapshot()
    b.store.$patch({ count: 42 })
    const after = a.getSnapshot()

    expect(after).not.toBe(before)
    expect(after.count).toBe(42)
    expect(b.getSnapshot()).toBe(after)
  })
})

describe('multiple handles for one id — action identity', () => {
  test('actions are reference-identical across handles — closure style', () => {
    const a = createStore('multi-action-closure', counterDef)
    const b = createStore('multi-action-closure', counterDef)
    expect(a.store.increment).toBe(b.store.increment)
  })

  test('actions are reference-identical across handles — class style', () => {
    class Counter {
      count = 0
      increment() { this.count++ }
    }
    const a = createStore('multi-action-class', Counter)
    const b = createStore('multi-action-class', Counter)
    expect(a.store.increment).toBe(b.store.increment)
  })
})

describe('multiple handles for one id — differing options.core', () => {
  test('warns once and the first core\'s plugins are the ones that run', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const firstPlugin: Plugin = { onStateChange: vi.fn(), onAction: vi.fn() }
    const secondPlugin: Plugin = { onStateChange: vi.fn(), onAction: vi.fn() }
    const firstCore = new CoreStore({ plugins: [firstPlugin] })
    const secondCore = new CoreStore({ plugins: [secondPlugin] })

    createStore('multi-core', counterDef, { core: firstCore })
    expect(warn).not.toHaveBeenCalled()

    const b = createStore('multi-core', counterDef, { core: secondCore })
    createStore('multi-core', counterDef, { core: secondCore })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/multi-core/)

    b.store.increment()
    b.store.$patch({ count: 9 })

    expect(firstPlugin.onAction).toHaveBeenCalledTimes(1)
    expect(firstPlugin.onStateChange).toHaveBeenCalledTimes(2)
    expect(secondPlugin.onAction).not.toHaveBeenCalled()
    expect(secondPlugin.onStateChange).not.toHaveBeenCalled()
  })

  test('same core on a later call does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const core = new CoreStore()

    createStore('multi-core-same', counterDef, { core })
    createStore('multi-core-same', counterDef, { core })
    createStore('multi-core-same', counterDef)

    // The third call resolves to the global core, which differs from `core`.
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('cross-store dependency invalidates the dependent snapshot', () => {
  const upstreamDef = () => {
    const store = {
      count: 1,
      increment() { store.count++ },
    }
    return store
  }

  const dependentDef = (useStore: UseStoreFn) => {
    const up = useStore<{ count: number }>('xs-upstream')
    return {
      get doubled() { return up.count * 2 },
    }
  }

  test('upstream mutation produces a new dependent snapshot reference', () => {
    const upstream = createStore('xs-upstream', upstreamDef)
    const dependent = createStore('xs-dependent', dependentDef)

    // Prime the dep edge by evaluating the computed once.
    expect(dependent.store.doubled).toBe(2)

    const cb = vi.fn()
    dependent.subscribe(generateComponentId(), ['*'], cb)

    const before = dependent.getSnapshot()
    upstream.store.increment()
    const after = dependent.getSnapshot()

    expect(cb).toHaveBeenCalledTimes(1)
    expect(after).not.toBe(before)
    expect(dependent.store.doubled).toBe(4)
  })

  test('upstream $patch produces a new dependent snapshot reference', () => {
    const upstream = createStore('xs-upstream', upstreamDef)
    const dependent = createStore('xs-dependent', dependentDef)

    expect(dependent.store.doubled).toBe(2)

    const before = dependent.getSnapshot()
    upstream.store.$patch({ count: 10 })
    const after = dependent.getSnapshot()

    expect(after).not.toBe(before)
    expect(dependent.store.doubled).toBe(20)
  })

  test('dependent snapshot is stable when the upstream does not change', () => {
    createStore('xs-upstream', upstreamDef)
    const dependent = createStore('xs-dependent', dependentDef)

    expect(dependent.store.doubled).toBe(2)
    expect(dependent.getSnapshot()).toBe(dependent.getSnapshot())
  })
})
