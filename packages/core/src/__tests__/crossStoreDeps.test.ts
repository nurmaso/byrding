import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createStore, generateComponentId } from '../createStore.js'
import { resetRegistry } from '../registry.js'
import {
  resetDepEdges,
  ByrdingCycleError,
  registerCrossStoreDep,
} from '../subscriptions.js'
import type { UseStoreFn } from '../types.js'

beforeEach(() => {
  resetRegistry()
  resetDepEdges()
})

describe('cross-store reactive subscriptions', () => {
  test('getter in A reading B.count re-fires A subscribers when B changes', () => {
    const bHandle = createStore('b', () => {
      const s = { count: 0, inc() { s.count++ } }
      return s
    })

    const aHandle = createStore('a', (useStore: UseStoreFn) => {
      const b = useStore<{ count: number }>('b')
      return {
        get doubled() { return b.count * 2 },
      }
    })

    const cb = vi.fn()
    aHandle.subscribe(generateComponentId(), ['*'], cb)

    // Prime dep edge by reading the computed getter once
    void aHandle.store.doubled

    expect(cb).not.toHaveBeenCalled()
    bHandle.store.inc()
    expect(cb).toHaveBeenCalledTimes(1)
    bHandle.store.inc()
    expect(cb).toHaveBeenCalledTimes(2)
  })

  test('getter value reflects upstream changes after notification', () => {
    const bHandle = createStore('reactive-b', () => {
      const s = { val: 10, set(v: number) { s.val = v } }
      return s
    })

    const aHandle = createStore('reactive-a', (useStore: UseStoreFn) => {
      const b = useStore<{ val: number }>('reactive-b')
      return {
        get tripled() { return b.val * 3 },
      }
    })

    // Prime dep edges
    expect(aHandle.store.tripled).toBe(30)

    bHandle.store.set(5)
    expect(aHandle.store.tripled).toBe(15)
  })

  test('linear chain A←B←C: changing C notifies B then A', () => {
    const cHandle = createStore('chain-c', () => {
      const s = { val: 0, set(v: number) { s.val = v } }
      return s
    })

    const bHandle = createStore('chain-b', (useStore: UseStoreFn) => {
      const c = useStore<{ val: number }>('chain-c')
      return {
        get fromC() { return c.val + 1 },
      }
    })

    const aHandle = createStore('chain-a', (useStore: UseStoreFn) => {
      const b = useStore<{ fromC: number }>('chain-b')
      return {
        get fromB() { return b.fromC + 10 },
      }
    })

    const cbA = vi.fn()
    const cbB = vi.fn()
    aHandle.subscribe(generateComponentId(), ['*'], cbA)
    bHandle.subscribe(generateComponentId(), ['*'], cbB)

    // Prime dep edges by reading both getters
    void aHandle.store.fromB
    void bHandle.store.fromC

    cHandle.store.set(5)
    expect(cbB).toHaveBeenCalledTimes(1)
    expect(cbA).toHaveBeenCalledTimes(1)
    expect(aHandle.store.fromB).toBe(16)
  })

  test('diamond A←B←D + A←C←D: D change notifies all without false cycle', () => {
    const dHandle = createStore('diamond-d', () => {
      const s = { val: 0, set(v: number) { s.val = v } }
      return s
    })

    // Manually register diamond dep edges to avoid getter recursion in setup
    // D changes → notify B and C; B changes → notify A; C changes → notify A
    createStore('diamond-b', () => ({ x: 0 }))
    createStore('diamond-c', () => ({ x: 0 }))
    createStore('diamond-a', () => ({ x: 0 }))

    registerCrossStoreDep('diamond-b', 'diamond-d')
    registerCrossStoreDep('diamond-c', 'diamond-d')
    registerCrossStoreDep('diamond-a', 'diamond-b')
    registerCrossStoreDep('diamond-a', 'diamond-c')

    // Should not throw despite A being reachable via two paths
    expect(() => dHandle.store.set(3)).not.toThrow()
  })

  test('direct cycle A←B←A: state change throws ByrdingCycleError', () => {
    const aHandle = createStore('cycle-a', () => {
      const s = { x: 0, setX(v: number) { s.x = v } }
      return s
    })

    createStore('cycle-b', () => {
      const s = { y: 0, setY(v: number) { s.y = v } }
      return s
    })

    // A depends on B AND B depends on A → cycle
    registerCrossStoreDep('cycle-a', 'cycle-b')
    registerCrossStoreDep('cycle-b', 'cycle-a')

    // A changes → propagate to B (B depends on A) → propagate to A (A depends on B) → CYCLE
    expect(() => aHandle.store.setX(1)).toThrow(ByrdingCycleError)
  })

  test('direct cycle error message lists the cycle path', () => {
    const aHandle = createStore('msg-a', () => {
      const s = { x: 0, set(v: number) { s.x = v } }
      return s
    })

    createStore('msg-b', () => {
      const s = { y: 0 }
      return s
    })

    registerCrossStoreDep('msg-a', 'msg-b')
    registerCrossStoreDep('msg-b', 'msg-a')

    let err: ByrdingCycleError | undefined
    try {
      aHandle.store.set(1)
    } catch (e) {
      if (e instanceof ByrdingCycleError) err = e
    }

    expect(err).toBeInstanceOf(ByrdingCycleError)
    expect(err!.cycle).toContain('msg-a')
    expect(err!.cycle).toContain('msg-b')
    expect(err!.message).toMatch(/Cycle:/)
  })

  test('self-cycle A→A throws ByrdingCycleError', () => {
    const aHandle = createStore('self-a', () => {
      const s = { x: 0, set(v: number) { s.x = v } }
      return s
    })

    // A depends on itself
    registerCrossStoreDep('self-a', 'self-a')

    expect(() => aHandle.store.set(1)).toThrow(ByrdingCycleError)
  })

  test('dep edges NOT registered during action calls', () => {
    const bHandle = createStore('nodep-b', () => {
      const s = { val: 0, set(v: number) { s.val = v } }
      return s
    })

    createStore('nodep-a', (useStore: UseStoreFn) => {
      const b = useStore<{ val: number }>('nodep-b')
      return {
        readB() { return b.val },
      }
    })

    const aHandle2 = createStore('nodep-a2', (useStore: UseStoreFn) => {
      const a = useStore<{ readB: () => number }>('nodep-a')
      return {
        readViaA() { return a.readB() },
      }
    })

    const cb = vi.fn()
    aHandle2.subscribe(generateComponentId(), ['*'], cb)

    // Call action (not getter) — should NOT register dep
    void aHandle2.store.readViaA()

    // Changing B should NOT notify a2 (no dep edge registered via action)
    bHandle.store.set(99)
    expect(cb).not.toHaveBeenCalled()
  })
})
