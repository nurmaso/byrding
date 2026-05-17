import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createStore } from '../createStore.js'
import { watchState } from '../watch.js'
import { resetRegistry } from '../registry.js'

beforeEach(() => {
  resetRegistry()
})

describe('watchState', () => {
  test('callback fires with newValue and oldValue when state changes via action', () => {
    const handle = createStore('counter', () => {
      const s = { count: 0, increment() { s.count++ } }
      return s
    })
    const cb = vi.fn()
    watchState(handle, 'count', cb)

    handle.store.increment()

    expect(cb).toHaveBeenCalledOnce()
    expect(cb).toHaveBeenCalledWith(1, 0)
  })

  test('callback fires with correct old/new values across multiple mutations', () => {
    const handle = createStore('multi', () => {
      const s = { count: 0, increment() { s.count++ } }
      return s
    })
    const cb = vi.fn()
    watchState(handle, 'count', cb)

    handle.store.increment()
    handle.store.increment()

    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenNthCalledWith(1, 1, 0)
    expect(cb).toHaveBeenNthCalledWith(2, 2, 1)
  })

  test('get() returns current live value', () => {
    const handle = createStore('getter', () => {
      const s = { count: 10, increment() { s.count++ } }
      return s
    })
    const { get } = watchState(handle, 'count', vi.fn())

    expect(get()).toBe(10)
    handle.store.increment()
    expect(get()).toBe(11)
  })

  test('set() writes through reactive surface and fires callback', () => {
    const handle = createStore('setter', () => {
      const s = { count: 0, increment() { s.count++ } }
      return s
    })
    const cb = vi.fn()
    const { get, set } = watchState(handle, 'count', cb)

    set(42)

    expect(get()).toBe(42)
    expect(cb).toHaveBeenCalledOnce()
    expect(cb).toHaveBeenCalledWith(42, 0)
  })

  test('set() notifies other subscribers of the same store', () => {
    const handle = createStore('shared', () => {
      const s = { value: 'a', update(v: string) { s.value = v } }
      return s
    })
    const watcherCb = vi.fn()
    const subscriberCb = vi.fn()
    const { set } = watchState(handle, 'value', watcherCb)
    handle.subscribe('external-component', ['value'], subscriberCb)

    set('b')

    expect(watcherCb).toHaveBeenCalledWith('b', 'a')
    expect(subscriberCb).toHaveBeenCalledOnce()
  })

  test('unwatch() stops callback from firing', () => {
    const handle = createStore('unwatch', () => {
      const s = { count: 0, increment() { s.count++ } }
      return s
    })
    const cb = vi.fn()
    const { unwatch } = watchState(handle, 'count', cb)

    handle.store.increment()
    expect(cb).toHaveBeenCalledOnce()

    unwatch()
    handle.store.increment()
    expect(cb).toHaveBeenCalledOnce()
  })

  test('works with class-style store', () => {
    class CounterStore {
      count = 0
      increment() { this.count++ }
    }
    const handle = createStore('class-watcher', CounterStore)
    const cb = vi.fn()
    watchState(handle, 'count', cb)

    handle.store.increment()

    expect(cb).toHaveBeenCalledWith(1, 0)
  })
})
