import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'

beforeEach(() => {
  resetRegistry()
})

test('$reset() restores closure store state to initial values', () => {
  const handle = createStore('counter', () => {
    const store = { count: 0, label: 'default', increment() { store.count++ } }
    return store
  })

  handle.store.increment()
  handle.store.increment()
  ;(handle.store as any).label = 'changed'

  expect(handle.store.count).toBe(2)
  expect((handle.store as any).label).toBe('changed')

  handle.store.$reset()

  expect(handle.store.count).toBe(0)
  expect((handle.store as any).label).toBe('default')
})

test('$reset() restores class store state to initial values', () => {
  class Counter {
    count = 10
    name = 'init'
    increment() { (this as any).count++ }
  }

  const handle = createStore('counter-class', Counter)

  handle.store.increment()
  handle.store.increment()

  expect(handle.store.count).toBe(12)

  handle.store.$reset()

  expect(handle.store.count).toBe(10)
  expect(handle.store.name).toBe('init')
})

test('$reset() only notifies for keys that changed', () => {
  const handle = createStore('notify-test', () => {
    const store = { a: 0, b: 5 }
    return store
  })

  const notified: string[] = []
  handle.subscribe('comp1', ['a', 'b'], () => notified.push('a-or-b'))

  // Only mutate `a`; `b` stays at initial value 5
  ;(handle.store as any).a = 99
  notified.length = 0  // clear mutation notification

  handle.store.$reset()

  // `a` changed back to 0 → notification fires
  // `b` was already 5 → no notification
  expect(notified.length).toBe(1)
  expect(handle.store.a).toBe(0)
  expect(handle.store.b).toBe(5)
})

test('$reset() does not clear subscriptions', () => {
  const handle = createStore('sub-test', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })

  const calls: number[] = []
  handle.subscribe('comp1', ['count'], () => calls.push(handle.store.count))

  handle.store.increment()    // count → 1
  handle.store.$reset()       // count → 0
  handle.store.increment()    // count → 1 again

  expect(calls).toEqual([1, 0, 1])
})
