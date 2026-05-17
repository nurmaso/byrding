import { describe, it, expect, vi } from 'vitest'
import { createMockStore } from '../testing.js'

class CounterStore {
  count = 0
  get double() { return this.count * 2 }
  increment() { this.count++ }
  decrement() { this.count-- }
}

const counterFactory = () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
    decrement() { store.count-- },
  }
  return store
}

describe('createMockStore — class style', () => {
  it('returns correct initial state values', () => {
    const mock = createMockStore(CounterStore, vi.fn)
    expect(mock.count).toBe(0)
  })

  it('action properties are callable spies', () => {
    const mock = createMockStore(CounterStore, vi.fn)
    ;(mock.increment as (...a: unknown[]) => unknown)()
    expect(mock.increment).toHaveBeenCalledOnce()
  })

  it('each action gets an independent spy', () => {
    const mock = createMockStore(CounterStore, vi.fn)
    ;(mock.increment as (...a: unknown[]) => unknown)()
    expect(mock.increment).toHaveBeenCalledOnce()
    expect(mock.decrement).not.toHaveBeenCalled()
  })

  it('does not include computed keys', () => {
    const mock = createMockStore(CounterStore, vi.fn)
    expect('double' in mock).toBe(false)
  })
})

describe('createMockStore — closure style', () => {
  it('returns correct initial state values', () => {
    const mock = createMockStore(counterFactory, vi.fn)
    expect(mock.count).toBe(0)
  })

  it('action properties are callable spies', () => {
    const mock = createMockStore(counterFactory, vi.fn)
    ;(mock.increment as (...a: unknown[]) => unknown)()
    expect(mock.increment).toHaveBeenCalledOnce()
  })

  it('each action gets an independent spy', () => {
    const mock = createMockStore(counterFactory, vi.fn)
    ;(mock.increment as (...a: unknown[]) => unknown)()
    expect(mock.increment).toHaveBeenCalledOnce()
    expect(mock.decrement).not.toHaveBeenCalled()
  })

  it('does not include computed keys', () => {
    const mock = createMockStore(counterFactory, vi.fn)
    expect('double' in mock).toBe(false)
  })
})

describe('createMockStore — spyFn default', () => {
  it('actions are callable without spyFn argument', () => {
    const mock = createMockStore(CounterStore)
    expect(() => (mock.increment as (...a: unknown[]) => unknown)()).not.toThrow()
  })
})
