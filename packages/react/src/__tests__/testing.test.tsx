import { resetRegistry } from '@byrding/core'
import { defineStore } from '../defineStore.js'
import { renderStore } from '../testing.js'

type CounterStore = { count: number; increment: () => void; decrement: () => void }
let useCounterStore: () => CounterStore

beforeEach(() => {
  resetRegistry()
  useCounterStore = defineStore('counter', () => {
    const store = { count: 0, increment() { store.count++ }, decrement() { store.count-- } }
    return store
  })
})

test('renderStore returns result with store state', () => {
  const { result } = renderStore(useCounterStore)
  expect(result.current.count).toBe(0)
})

test('renderStore returns act, rerender, and unmount', () => {
  const { result, act, rerender, unmount } = renderStore(useCounterStore)
  expect(typeof act).toBe('function')
  expect(typeof rerender).toBe('function')
  expect(typeof unmount).toBe('function')
  expect(result.current.count).toBe(0)
})

test('act flushes action mutations synchronously', async () => {
  const { result, act } = renderStore(useCounterStore)
  expect(result.current.count).toBe(0)
  await act(() => { result.current.increment() })
  expect(result.current.count).toBe(1)
})

test('multiple act calls accumulate correctly', async () => {
  const { result, act } = renderStore(useCounterStore)
  await act(() => { result.current.increment() })
  await act(() => { result.current.increment() })
  await act(() => { result.current.decrement() })
  expect(result.current.count).toBe(1)
})

test('resetRegistry in beforeEach gives a fresh store each test', () => {
  const { result } = renderStore(useCounterStore)
  expect(result.current.count).toBe(0)
})
