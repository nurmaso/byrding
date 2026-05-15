import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'

beforeEach(() => {
  resetRegistry()
})

test('createStore returns a handle with initial state', () => {
  const handle = createStore('counter', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })
  expect(handle.store.count).toBe(0)
})

test('createStore action mutates state', () => {
  const handle = createStore('counter2', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })
  handle.store.increment()
  expect(handle.store.count).toBe(1)
})
