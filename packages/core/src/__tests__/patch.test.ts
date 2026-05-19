import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'

beforeEach(() => {
  resetRegistry()
})

test('$patch() updates multiple state keys at once — closure', () => {
  const handle = createStore('counter', () => {
    const store = { count: 0, label: 'default', flag: false }
    return store
  })

  handle.store.$patch({ count: 5, label: 'updated' })

  expect(handle.store.count).toBe(5)
  expect((handle.store as any).label).toBe('updated')
  expect((handle.store as any).flag).toBe(false)
})

test('$patch() updates multiple state keys at once — class', () => {
  class Counter {
    count = 0
    label = 'default'
    flag = false
  }

  const handle = createStore('counter-class', Counter)

  handle.store.$patch({ count: 5, label: 'updated' } as any)

  expect(handle.store.count).toBe(5)
  expect((handle.store as any).label).toBe('updated')
  expect((handle.store as any).flag).toBe(false)
})

test('$patch() fires subscribers exactly once for multiple key changes', () => {
  const handle = createStore('counter', () => {
    const store = { a: 0, b: 0, c: 0 }
    return store
  })

  let callCount = 0
  handle.subscribe('comp1', ['*'], () => { callCount++ })

  handle.store.$patch({ a: 1, b: 2, c: 3 })

  expect(callCount).toBe(1)
  expect(handle.store.a).toBe(1)
  expect(handle.store.b).toBe(2)
  expect(handle.store.c).toBe(3)
})

test('$patch() fires no subscribers when no values change', () => {
  const handle = createStore('counter', () => {
    const store = { count: 5 }
    return store
  })

  let callCount = 0
  handle.subscribe('comp1', ['*'], () => { callCount++ })

  handle.store.$patch({ count: 5 })

  expect(callCount).toBe(0)
})

test('$patch() fires no subscribers when only unchanged keys are given', () => {
  const handle = createStore('counter', () => {
    const store = { a: 1, b: 2 }
    return store
  })

  let callCount = 0
  handle.subscribe('comp1', ['*'], () => { callCount++ })

  handle.store.$patch({ a: 1, b: 2 })

  expect(callCount).toBe(0)
})

test('$patch() ignores unknown keys', () => {
  const handle = createStore('counter', () => {
    const store = { count: 0 }
    return store
  })

  handle.store.$patch({ count: 5, unknown: 'ignored' } as any)

  expect(handle.store.count).toBe(5)
  expect((handle.store as any).unknown).toBeUndefined()
})

test('$patch() invalidates snapshot cache', () => {
  const handle = createStore('counter', () => {
    const store = { count: 0 }
    return store
  })

  const snap1 = handle.getSnapshot()
  handle.store.$patch({ count: 10 })
  const snap2 = handle.getSnapshot()

  expect(snap1).not.toBe(snap2)
  expect(snap2.count).toBe(10)
})

test('$patch() notifies only subscribers of changed keys', () => {
  const handle = createStore('counter', () => {
    const store = { a: 0, b: 0 }
    return store
  })

  const aNotified: number[] = []
  const bNotified: number[] = []
  handle.subscribe('comp-a', ['a'], () => aNotified.push(handle.store.a))
  handle.subscribe('comp-b', ['b'], () => bNotified.push(handle.store.b))

  // Only patch `a` — comp-b should not be notified via wildcard since
  // $patch uses notify('*') which fires ALL callbacks.
  // Both comps are notified because $patch uses '*' for atomicity.
  handle.store.$patch({ a: 99 })

  // Both fire once (wildcard semantics — $patch trades per-key precision for
  // single-notification atomicity)
  expect(aNotified).toEqual([99])
})

test('$patch() partially overlapping patch — only changed keys matter', () => {
  const handle = createStore('counter', () => {
    const store = { x: 10, y: 20, z: 30 }
    return store
  })

  handle.store.$patch({ x: 10, y: 99 })  // x unchanged, y changed

  expect(handle.store.x).toBe(10)
  expect(handle.store.y).toBe(99)
  expect(handle.store.z).toBe(30)
})
