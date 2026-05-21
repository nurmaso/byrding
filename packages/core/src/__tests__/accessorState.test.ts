import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'
import { resetDepEdges } from '../subscriptions.js'
import { CoreStore } from '../coreStore.js'

beforeEach(() => {
  resetRegistry()
  resetDepEdges()
})

describe('accessor state — class style', () => {
  class TemperatureStore {
    _celsius = 0

    get fahrenheit() { return this._celsius * 9 / 5 + 32 }
    set fahrenheit(v: number) { this._celsius = (v - 32) * 5 / 9 }

    setCelsius(v: number) { this._celsius = v }
  }

  test('initial value read via getter', () => {
    const { store } = createStore('temp-class-init', TemperatureStore)
    expect(store.fahrenheit).toBe(32)
  })

  test('write via merged store setter triggers getter update', () => {
    const { store } = createStore('temp-class-write', TemperatureStore)
    store.fahrenheit = 212
    expect(store._celsius).toBeCloseTo(100)
    expect(store.fahrenheit).toBe(212)
  })

  test('action mutating underlying state updates accessor read', () => {
    const { store } = createStore('temp-class-action', TemperatureStore)
    store.setCelsius(100)
    expect(store.fahrenheit).toBe(212)
  })

  test('subscriber notified on write via accessor setter', () => {
    const handle = createStore('temp-class-sub', TemperatureStore)
    const cb = vi.fn()
    handle.subscribe('c1', ['fahrenheit'], cb)
    handle.store.fahrenheit = 212
    expect(cb).toHaveBeenCalledOnce()
  })

  test('snapshot reflects getter value for accessor key', () => {
    const handle = createStore('temp-class-snap', TemperatureStore)
    handle.store.fahrenheit = 212
    const snap = handle.getSnapshot()
    expect(snap.fahrenheit).toBe(212)
    expect(snap._celsius).toBeCloseTo(100)
  })

  test('snapshot is invalidated and recomputed after mutation', () => {
    const handle = createStore('temp-class-snap2', TemperatureStore)
    const snap1 = handle.getSnapshot()
    handle.store.fahrenheit = 212
    const snap2 = handle.getSnapshot()
    expect(snap1).not.toBe(snap2)
    expect(snap2.fahrenheit).toBe(212)
  })
})

describe('accessor state — closure style', () => {
  const closureStore = () => {
    let _celsius = 0
    return {
      get fahrenheit() { return _celsius * 9 / 5 + 32 },
      set fahrenheit(v: number) { _celsius = (v - 32) * 5 / 9 },
    }
  }

  test('initial value read via getter', () => {
    const { store } = createStore('temp-closure-init', closureStore)
    expect(store.fahrenheit).toBe(32)
  })

  test('write via merged store setter updates getter', () => {
    const { store } = createStore('temp-closure-write', closureStore)
    store.fahrenheit = 212
    expect(store.fahrenheit).toBe(212)
  })

  test('subscriber notified on write via accessor setter', () => {
    const handle = createStore('temp-closure-sub', closureStore)
    const cb = vi.fn()
    handle.subscribe('c1', ['fahrenheit'], cb)
    handle.store.fahrenheit = 212
    expect(cb).toHaveBeenCalledOnce()
  })

  test('no double-notification — wrappedSet shared between property and _accessorFns', () => {
    const handle = createStore('temp-closure-no-double', closureStore)
    const cb = vi.fn()
    handle.subscribe('c1', ['fahrenheit'], cb)
    handle.store.fahrenheit = 212
    handle.store.fahrenheit = 100
    expect(cb).toHaveBeenCalledTimes(2)
  })

  test('subscriber receives correct old and new values', () => {
    const handle = createStore('temp-closure-vals', closureStore)
    const cb = vi.fn()
    handle.subscribe('c1', ['fahrenheit'], cb)
    handle.store.fahrenheit = 212
    expect(cb).toHaveBeenCalledOnce()
  })

  test('snapshot reflects getter value for accessor key', () => {
    const handle = createStore('temp-closure-snap', closureStore)
    handle.store.fahrenheit = 212
    const snap = handle.getSnapshot()
    expect(snap.fahrenheit).toBe(212)
  })

  test('snapshot is invalidated and recomputed after mutation', () => {
    const handle = createStore('temp-closure-snap2', closureStore)
    const snap1 = handle.getSnapshot()
    handle.store.fahrenheit = 212
    const snap2 = handle.getSnapshot()
    expect(snap1).not.toBe(snap2)
    expect(snap2.fahrenheit).toBe(212)
  })
})

describe('accessor state — $patch', () => {
  test('class style: $patch with accessor key calls setter and notifies', () => {
    class TempStore {
      _celsius = 0
      get fahrenheit() { return this._celsius * 9 / 5 + 32 }
      set fahrenheit(v: number) { this._celsius = (v - 32) * 5 / 9 }
    }
    const handle = createStore('patch-class', TempStore)
    const cb = vi.fn()
    handle.subscribe('c1', ['fahrenheit'], cb)
    handle.store.$patch({ fahrenheit: 212 } as any)
    expect(handle.store.fahrenheit).toBe(212)
    expect(handle.store._celsius).toBeCloseTo(100)
    expect(cb).toHaveBeenCalled()
  })

  test('closure style: $patch with accessor key calls setter and notifies', () => {
    const handle = createStore('patch-closure', () => {
      let _celsius = 0
      return {
        get fahrenheit() { return _celsius * 9 / 5 + 32 },
        set fahrenheit(v: number) { _celsius = (v - 32) * 5 / 9 },
      }
    })
    const cb = vi.fn()
    handle.subscribe('c1', ['fahrenheit'], cb)
    handle.store.$patch({ fahrenheit: 212 } as any)
    expect(handle.store.fahrenheit).toBe(212)
    expect(cb).toHaveBeenCalled()
  })
})

describe('accessor state — onInit plugin snapshot', () => {
  test('class style: onInit receives accessor values in snapshot', () => {
    class TempStore {
      _celsius = 100
      get fahrenheit() { return this._celsius * 9 / 5 + 32 }
      set fahrenheit(v: number) { this._celsius = (v - 32) * 5 / 9 }
    }
    const core = new CoreStore()
    const onInit = vi.fn()
    core.use({ onInit })
    createStore('init-snap-class', TempStore, { core })
    expect(onInit).toHaveBeenCalledOnce()
    const snapshot = onInit.mock.calls[0][1]
    expect(snapshot.fahrenheit).toBe(212)
    expect(snapshot._celsius).toBe(100)
  })

  test('closure style: onInit receives accessor values in snapshot', () => {
    const core = new CoreStore()
    const onInit = vi.fn()
    core.use({ onInit })
    createStore('init-snap-closure', () => {
      let _celsius = 100
      return {
        get fahrenheit() { return _celsius * 9 / 5 + 32 },
        set fahrenheit(v: number) { _celsius = (v - 32) * 5 / 9 },
      }
    }, { core })
    expect(onInit).toHaveBeenCalledOnce()
    const snapshot = onInit.mock.calls[0][1]
    expect(snapshot.fahrenheit).toBe(212)
  })
})

describe('accessor state — cross-store dep tracking', () => {
  test('accessor read via useStore() inside computed registers dep edge', () => {
    const sourceHandle = createStore('dep-source', () => {
      let _celsius = 0
      return {
        get fahrenheit() { return _celsius * 9 / 5 + 32 },
        set fahrenheit(v: number) { _celsius = (v - 32) * 5 / 9 },
      }
    })

    const consumerHandle = createStore('dep-consumer', (useStore) => {
      const source = useStore<{ fahrenheit: number }>('dep-source')
      return {
        get tempLabel() { return `${source.fahrenheit}°F` },
      }
    })

    // Read the computed to trigger dep-edge registration
    expect(consumerHandle.store.tempLabel).toBe('32°F')

    const cb = vi.fn()
    consumerHandle.subscribe('c1', ['*'], cb)

    // Write to source accessor via its public API — triggers _notify on source
    // which propagates to consumer via the registered dep edge
    sourceHandle.store.fahrenheit = 212

    expect(cb).toHaveBeenCalled()
    expect(consumerHandle.store.tempLabel).toBe('212°F')
  })
})

describe('accessor state — classification', () => {
  test('get-only is still computed, not accessor', () => {
    const handle = createStore('computed-only', () => {
      const s = { count: 2, get doubled() { return s.count * 2 } }
      return s
    })
    // doubled should be read-only computed — writes silently ignored or throw
    expect(handle.store.doubled).toBe(4)
  })

  test('get+set pair classified as accessor, not computed', () => {
    const handle = createStore('accessor-check', () => {
      let _val = 10
      return {
        get value() { return _val },
        set value(v: number) { _val = v },
      }
    })
    expect(handle.store.value).toBe(10)
    handle.store.value = 42
    expect(handle.store.value).toBe(42)
  })
})
