import { storeRegistry, resetRegistry, _buildRegistry } from '../registry.js'
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
  const hotData: Record<string, unknown> = { storeRegistry: preserved }

  const restored = _buildRegistry(hotData)

  expect(restored).toBe(preserved)
  expect(restored.has('store-a')).toBe(true)
})

test('HMR: falls back to new Map when hot.data has no storeRegistry', () => {
  const hotData: Record<string, unknown> = {}

  const registry = _buildRegistry(hotData)

  expect(registry).toBeInstanceOf(Map)
  expect(registry.size).toBe(0)
})

test('HMR: writes registry back into hot.data so next reload finds it', () => {
  const hotData: Record<string, unknown> = {}
  const registry = _buildRegistry(hotData)
  registry.set('store-a', mockStore)

  expect(hotData['storeRegistry']).toBe(registry)
  expect((hotData['storeRegistry'] as Map<string, StoreInstance>).has('store-a')).toBe(true)
})

test('HMR: no hot.data (production) produces a fresh Map and does not throw', () => {
  const registry = _buildRegistry(undefined)

  expect(registry).toBeInstanceOf(Map)
  expect(registry.size).toBe(0)
})
