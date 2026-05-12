import { storeRegistry, resetRegistry } from '../registry.js'
import type { StoreInstance } from '../types.js'

const mockStore = {} as StoreInstance

beforeEach(() => {
  resetRegistry()
})

test('resetRegistry clears all entries', () => {
  storeRegistry.set('store-a', mockStore)
  storeRegistry.set('store-b', mockStore)
  expect(storeRegistry.size).toBe(2)
  resetRegistry()
  expect(storeRegistry.size).toBe(0)
})

test('resetRegistry is idempotent on an empty registry', () => {
  expect(() => resetRegistry()).not.toThrow()
  expect(storeRegistry.size).toBe(0)
})

test('storeRegistry is usable after reset', () => {
  storeRegistry.set('store-a', mockStore)
  resetRegistry()
  storeRegistry.set('store-b', mockStore)
  expect(storeRegistry.has('store-a')).toBe(false)
  expect(storeRegistry.has('store-b')).toBe(true)
})
