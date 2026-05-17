import { createStore } from '../createStore.js'
import { getContext } from '../getContext.js'
import { resetRegistry } from '../registry.js'

beforeEach(() => {
  resetRegistry()
})

test('getContext returns top-level shape', () => {
  const ctx = getContext()
  expect(typeof ctx.version).toBe('string')
  expect(typeof ctx.timestamp).toBe('string')
  expect(typeof ctx.stores).toBe('object')
})

test('getContext includes registered store with correct state', () => {
  createStore('counter', () => {
    const store = { count: 0, label: 'test', increment() { store.count++ } }
    return store
  })

  const ctx = getContext()
  const s = ctx.stores['counter']

  expect(s).toBeDefined()
  expect(s.state.count).toBe(0)
  expect(s.state.label).toBe('test')
})

test('getContext stateSchema reflects typeof each state key', () => {
  createStore('typed', () => {
    const store = { n: 1, s: 'hello', b: true, increment() { store.n++ } }
    return store
  })

  const ctx = getContext()
  const schema = ctx.stores['typed'].stateSchema

  expect(schema.n).toBe('number')
  expect(schema.s).toBe('string')
  expect(schema.b).toBe('boolean')
})

test('getContext lists action names', () => {
  createStore('withActions', () => {
    const store = { count: 0, increment() { store.count++ }, reset() { store.count = 0 } }
    return store
  })

  const ctx = getContext()
  expect(ctx.stores['withActions'].actions).toContain('increment')
  expect(ctx.stores['withActions'].actions).toContain('reset')
})

test('getContext computed values reflect current derived state', () => {
  createStore('withComputed', () => {
    const store = {
      count: 2,
      get doubled() { return store.count * 2 },
      increment() { store.count++ },
    }
    return store
  })

  const ctx = getContext()
  expect(ctx.stores['withComputed'].computed.doubled).toBe(4)
})

test('getContext computed reflects state after mutation', () => {
  const handle = createStore('mutated', () => {
    const store = {
      count: 0,
      get doubled() { return store.count * 2 },
      increment() { store.count++ },
    }
    return store
  })

  handle.store.increment()
  handle.store.increment()

  const ctx = getContext()
  expect(ctx.stores['mutated'].state.count).toBe(2)
  expect(ctx.stores['mutated'].computed.doubled).toBe(4)
})

test('getContext subscriberCount is 0 with no subscribers', () => {
  createStore('noSubs', () => {
    const store = { x: 1, noop() {} }
    return store
  })

  expect(getContext().stores['noSubs'].subscriberCount).toBe(0)
})

test('getContext output is JSON.stringify-safe', () => {
  createStore('serializable', () => {
    const store = { value: 42, increment() { store.value++ } }
    return store
  })

  expect(() => JSON.stringify(getContext())).not.toThrow()
})

test('getContext does not mutate any store state', () => {
  const handle = createStore('immutable', () => {
    const store = { count: 5, noop() {} }
    return store
  })

  getContext()
  expect(handle.store.count).toBe(5)
})

test('getContext covers multiple stores', () => {
  createStore('a', () => {
    const store = { x: 1, noop() {} }
    return store
  })
  createStore('b', () => {
    const store = { y: 2, noop() {} }
    return store
  })

  const ctx = getContext()
  expect(Object.keys(ctx.stores)).toContain('a')
  expect(Object.keys(ctx.stores)).toContain('b')
})
