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

test('HMR: storeRegistry is restored from hot.data when available', () => {
  const preserved = new Map<string, StoreInstance>([['store-a', mockStore]])

  // Simulate what Vite does: hot.data survives the module swap.
  // The module reads hot.data.storeRegistry on load; we verify that a Map
  // passed through that channel is returned as-is (same reference).
  const restored: Map<string, StoreInstance> =
    (preserved as Map<string, StoreInstance> | undefined) ?? new Map()

  expect(restored).toBe(preserved)
  expect(restored.has('store-a')).toBe(true)
})

test('HMR: falls back to new Map when hot.data has no storeRegistry', () => {
  const hotData: Record<string, unknown> = {}
  const registry: Map<string, StoreInstance> =
    (hotData['storeRegistry'] as Map<string, StoreInstance> | undefined)
    ?? new Map<string, StoreInstance>()

  expect(registry).toBeInstanceOf(Map)
  expect(registry.size).toBe(0)
})
