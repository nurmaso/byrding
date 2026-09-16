// ESM consumption smoke test.  Runs against the BUILT artifacts, resolved
// through each package's `exports` map exactly as an installed consumer
// would — no source aliases.  `pnpm build` first.
import assert from 'node:assert/strict'
import { createStore, storeRegistry, getContext } from '@byrding/core'
import { createMockStore } from '@byrding/core/testing'
import { defineStore as defineReactStore } from '@byrding/react'
import { defineStore as defineVueStore } from '@byrding/vue'

const warnings = []
const originalWarn = console.warn
console.warn = (...args) => { warnings.push(args.join(' ')) }

const counter = () => {
  const store = { count: 0, increment() { store.count++ } }
  return store
}

const useReactCounter = defineReactStore('smoke-counter', counter)
const useVueCounter = defineVueStore('smoke-counter', counter)
assert.equal(typeof useReactCounter, 'function', 'react defineStore returns a hook')
assert.equal(typeof useVueCounter, 'function', 'vue defineStore returns a composable')

// Both adapters resolved the same copy of core: one registry, one store.
assert.equal(storeRegistry.size, 1, 'react and vue adapters share a single registry')

const vueStore = useVueCounter()
vueStore.increment()
assert.equal(createStore('smoke-counter', counter).store.count, 1, 'mutation via vue composable is visible through core')

assert.match(getContext().version, /^\d+\.\d+\.\d+/, 'getContext().version is a real version')
assert.deepEqual(Object.keys(createMockStore(counter)).sort(), ['count', 'increment'], '@byrding/core/testing resolves')

console.warn = originalWarn
assert.deepEqual(warnings, [], `no byrding warnings expected (duplicate-copy / duplicate-id), got: ${warnings.join(' | ')}`)

console.log('smoke: esm ok')
