import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'
import { resetDepEdges } from '../subscriptions.js'
import { resetDevWarnings } from '../devWarn.js'

// `createStore` is first-wins per id: a later call's definition is discarded.
// That is the normal path when React and Vue adapters (or a Vite HMR
// re-evaluation) register the same exported definition, so passing the SAME
// function reference must stay silent.  Passing a DIFFERENT reference is
// almost always a mistake — a test that forgot `resetRegistry()`, or an
// edited definition under HMR that will never take effect — so it warns.

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetRegistry()
  resetDepEdges()
  resetDevWarnings()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

const closureDef = () => {
  const store = { count: 0, increment() { store.count++ } }
  return store
}

class ClassDef {
  count = 0
  increment() { this.count++ }
}

describe('duplicate id — same definition reference', () => {
  test('closure: repeated registration is silent', () => {
    createStore('dup-same-closure', closureDef)
    createStore('dup-same-closure', closureDef)
    createStore('dup-same-closure', closureDef)
    expect(warn).not.toHaveBeenCalled()
  })

  test('class: repeated registration is silent', () => {
    createStore('dup-same-class', ClassDef)
    createStore('dup-same-class', ClassDef)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('duplicate id — different definition reference', () => {
  test('closure: warns once, names the id, and keeps the first definition', () => {
    const first = createStore('dup-diff-closure', closureDef)
    const second = createStore('dup-diff-closure', () => {
      const store = { count: 99, increment() { store.count += 10 } }
      return store
    })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/dup-diff-closure/)
    expect(warn.mock.calls[0][0]).toMatch(/definition/)

    // First registration wins: the second definition's state and actions are ignored.
    expect(second.store.count).toBe(0)
    second.store.increment()
    expect(first.store.count).toBe(1)
  })

  test('class: warns once', () => {
    class Other {
      count = 99
      increment() { this.count += 10 }
    }
    createStore('dup-diff-class', ClassDef)
    createStore('dup-diff-class', Other)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/dup-diff-class/)
  })

  test('mixing styles for one id warns once', () => {
    createStore('dup-diff-mixed', ClassDef)
    createStore('dup-diff-mixed', closureDef)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('repeated mismatched calls for the same id warn only once', () => {
    createStore('dup-diff-repeat', closureDef)
    createStore('dup-diff-repeat', () => ({ count: 1 }))
    createStore('dup-diff-repeat', () => ({ count: 2 }))
    createStore('dup-diff-repeat', () => ({ count: 3 }))
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('mismatches on two different ids warn once each', () => {
    createStore('dup-diff-a', closureDef)
    createStore('dup-diff-b', closureDef)
    createStore('dup-diff-a', () => ({ count: 1 }))
    createStore('dup-diff-b', () => ({ count: 1 }))
    expect(warn).toHaveBeenCalledTimes(2)
  })

  test('silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      createStore('dup-diff-prod', closureDef)
      createStore('dup-diff-prod', () => ({ count: 1 }))
      expect(warn).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
