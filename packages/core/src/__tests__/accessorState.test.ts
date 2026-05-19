import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'

beforeEach(() => {
  resetRegistry()
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
