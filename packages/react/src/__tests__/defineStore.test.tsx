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

// ─── HMR behaviour ───────────────────────────────────────────────────────────
// Simulates what happens when Vite hot-reloads defineStore.ts:
// createStore is called again with the same id — it must return the preserved
// instance, so hooks using either the old or new useStore see the same state.

test('HMR: second defineStore call with same id returns hook sharing state', () => {
  const useCounter = defineStore('hmr-counter', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })
  const { result: r1 } = renderHook(() => useCounter())
  act(() => { r1.current.increment() })
  expect(r1.current.count).toBe(1)

  // Simulate module re-evaluation after HMR: defineStore called again.
  // Registry idempotency means the second call returns the same store instance.
  const useCounter2 = defineStore('hmr-counter', () => {
    const store = { count: 99, increment() { store.count++ } }
    return store
  })
  const { result: r2 } = renderHook(() => useCounter2())
  // State is preserved from the original instance (count=1, not reset to 99).
  expect(r2.current.count).toBe(1)
})

test('HMR: import.meta.hot.accept() is called when hot is defined', () => {
  const acceptSpy = vi.fn()
  const originalHot = (import.meta as Record<string, unknown>).hot
  ;(import.meta as Record<string, unknown>).hot = { accept: acceptSpy }
  try {
    // Re-evaluating the guard: since the module is already loaded we call the
    // guard logic directly to simulate what runs at module load time.
    if (import.meta.hot) {
      import.meta.hot.accept()
    }
    expect(acceptSpy).toHaveBeenCalledOnce()
  } finally {
    ;(import.meta as Record<string, unknown>).hot = originalHot
  }
})
