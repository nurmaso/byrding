import { renderHook, act } from '@testing-library/react'
import { resetRegistry } from '@byrding/core'
import { defineStore } from '../defineStore.js'

beforeEach(() => {
  resetRegistry()
})

test('hook returns store state', () => {
  const useCounter = defineStore('counter', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })
  const { result } = renderHook(() => useCounter())
  expect(result.current.count).toBe(0)
})

test('hook reflects action mutations', () => {
  const useCounter = defineStore('counter2', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })
  const { result } = renderHook(() => useCounter())
  act(() => { result.current.increment() })
  expect(result.current.count).toBe(1)
})
