import { describe, test, expect, beforeEach } from 'vitest'
import { createStore } from '../createStore.js'
import { resetRegistry } from '../registry.js'
import type { UseStoreFn } from '../types.js'

beforeEach(() => {
  resetRegistry()
})

describe('useStore() — inter-store composition primitive', () => {
  test('standard cross-store action call: store A reads store B state inside an action', () => {
    const userHandle = createStore('users', () => {
      const s = {
        isLoggedIn: false,
        login() { s.isLoggedIn = true },
      }
      return s
    })

    const orderHandle = createStore('orders', (useStore: UseStoreFn) => {
      const userStore = useStore<{ isLoggedIn: boolean; login: () => void }>('users')
      const s = {
        lastOrder: '' as string,
        placeOrder(item: string) {
          if (!userStore.isLoggedIn) throw new Error('Not authenticated')
          s.lastOrder = item
        },
      }
      return s
    })

    expect(() => orderHandle.store.placeOrder('widget')).toThrow('Not authenticated')
    userHandle.store.login()
    orderHandle.store.placeOrder('widget')
    expect(orderHandle.store.lastOrder).toBe('widget')
  })

  test('cross-store state read reflects live mutations', () => {
    const counterHandle = createStore('counter', () => {
      const s = { count: 0, increment() { s.count++ } }
      return s
    })

    const displayHandle = createStore('display', (useStore: UseStoreFn) => {
      const counter = useStore<{ count: number; increment: () => void }>('counter')
      return {
        getCount() { return counter.count },
      }
    })

    expect(displayHandle.store.getCount()).toBe(0)
    counterHandle.store.increment()
    expect(displayHandle.store.getCount()).toBe(1)
    counterHandle.store.increment()
    expect(displayHandle.store.getCount()).toBe(2)
  })

  test('forward reference: store A uses store B before B is registered', () => {
    // Order store references users store via useStore, but users is registered after
    const orderHandle = createStore('orders', (useStore: UseStoreFn) => {
      // B (users) not yet registered — lazy proxy returned
      const userStore = useStore<{ name: string }>('users')
      return {
        getOwner() { return userStore.name },
      }
    })

    // B registered now — AFTER A's factory already ran
    createStore('users', () => {
      const s = { name: 'Alice' }
      return s
    })

    // First access to the lazy proxy now resolves users from the registry
    expect(orderHandle.store.getOwner()).toBe('Alice')
  })

  test('forward reference proxy throws if target never registered when first accessed', () => {
    const handle = createStore('a', (useStore: UseStoreFn) => {
      const missing = useStore<{ x: number }>('nonexistent')
      return {
        read() { return missing.x },
      }
    })

    expect(() => handle.store.read()).toThrow(`store "nonexistent" is not yet registered`)
  })

  test('self-reference: store uses itself via useStore', () => {
    const handle = createStore('self', (useStore: UseStoreFn) => {
      const selfRef = useStore<{ value: number; inc: () => void }>('self')
      const s = {
        value: 0,
        inc() { s.value++ },
        // selfRef resolves from registry after factory completes
        readViaSelf() { return selfRef.value },
      }
      return s
    })

    expect(handle.store.readViaSelf()).toBe(0)
    handle.store.inc()
    expect(handle.store.readViaSelf()).toBe(1)
  })

  test('useStore() outside definition context throws descriptive error', () => {
    // Capture the useStore fn by storing it from the factory
    let capturedUseStore: UseStoreFn | null = null
    createStore('leak', (useStore: UseStoreFn) => {
      capturedUseStore = useStore
      return { x: 0 }
    })

    // After the factory completes, calling the captured fn must throw
    expect(() => capturedUseStore!<{ x: number }>('leak')).toThrow(
      'useStore() may only be called inside a store factory function or class constructor'
    )
  })

  test('class-style: useStore passed as constructor argument', () => {
    const authHandle = createStore('auth', () => {
      const s = { token: 'abc123' }
      return s
    })

    class ProfileStore {
      displayToken: string
      constructor(useStore: UseStoreFn) {
        const auth = useStore<{ token: string }>('auth')
        // auth.token resolves lazily; but 'auth' IS registered (defined above)
        this.displayToken = auth.token
      }
    }

    const profileHandle = createStore('profile', ProfileStore)
    // displayToken was captured from auth.token at construction time
    expect(profileHandle.store.displayToken).toBe('abc123')
  })
})
