import { describe, test, expect, beforeEach } from 'vitest'
import { createStore, resetRegistry } from '@byrding/core'
import { persistPlugin } from '../index.js'

// ─── In-memory Storage stub ───────────────────────────────────────────────────

function makeStorage(): Storage {
  const map: Record<string, string> = {}
  return {
    getItem: (k) => map[k] ?? null,
    setItem: (k, v) => { map[k] = v },
    removeItem: (k) => { delete map[k] },
    clear: () => { Object.keys(map).forEach((k) => delete map[k]) },
    key: (i) => Object.keys(map)[i] ?? null,
    get length() { return Object.keys(map).length },
  }
}

beforeEach(() => {
  resetRegistry()
})

// ─── onStateChange — write to storage ────────────────────────────────────────

describe('onStateChange', () => {
  test('persists state on change', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({ storage })

    // Plugin must be in the returned object (not a spread copy) so that
    // inc() closes over the reactive instance, not a stale copy.
    const handle = createStore('counter', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })

    handle.store.inc()
    expect(storage.getItem('byrding:counter:count')).toBe('1')
  })

  test('uses custom prefix', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({ storage, prefix: 'app' })

    const handle = createStore('counter', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })

    handle.store.inc()
    expect(storage.getItem('app:count')).toBe('1')
  })

  test('keys allowlist — only persists listed keys', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({ storage, keys: ['name'] })

    const handle = createStore('user', () => {
      const s = {
        name: 'alice',
        age: 30,
        setName(n: string) { s.name = n },
        setAge(a: number) { s.age = a },
        plugins: [plugin],
      }
      return s
    })

    handle.store.setName('bob')
    handle.store.setAge(31)

    expect(storage.getItem('byrding:user:name')).toBe('"bob"')
    expect(storage.getItem('byrding:user:age')).toBeNull()
  })

  test('persists all keys when keys omitted', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({ storage })

    const handle = createStore('settings', () => {
      const s = {
        theme: 'light' as 'light' | 'dark',
        setTheme(t: 'light' | 'dark') { s.theme = t },
        plugins: [plugin],
      }
      return s
    })

    handle.store.setTheme('dark')
    expect(storage.getItem('byrding:settings:theme')).toBe('"dark"')
  })

  test('uses custom serialize', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({
      storage,
      serialize: (v) => String(v),
      deserialize: (r) => r,
    })

    const handle = createStore('simple', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })

    handle.store.inc()
    expect(storage.getItem('byrding:simple:count')).toBe('1')
  })

  test('global plugin with stores allowlist — ignores non-listed stores', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({ storage, stores: ['user'] })

    const counterHandle = createStore('counter', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })
    const userHandle = createStore('user', () => {
      const s = { name: 'alice', setName(n: string) { s.name = n }, plugins: [plugin] }
      return s
    })

    counterHandle.store.inc()
    userHandle.store.setName('bob')

    expect(storage.getItem('byrding:counter:count')).toBeNull()
    expect(storage.getItem('byrding:user:name')).toBe('"bob"')
  })

  test('QuotaExceededError is caught and does not throw', () => {
    const storage = makeStorage()
    storage.setItem = () => {
      const e = new DOMException('quota exceeded', 'QuotaExceededError')
      throw e
    }
    const plugin = persistPlugin({ storage })

    const handle = createStore('counter', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })

    expect(() => handle.store.inc()).not.toThrow()
  })
})

// ─── onInit — rehydration ─────────────────────────────────────────────────────

describe('onInit', () => {
  test('rehydrates state from storage before first read', () => {
    const storage = makeStorage()
    storage.setItem('byrding:counter:count', '42')

    const plugin = persistPlugin({ storage })
    const handle = createStore('counter', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })

    expect(handle.store.count).toBe(42)
  })

  test('rehydrates only listed keys', () => {
    const storage = makeStorage()
    storage.setItem('byrding:user:name', '"bob"')
    storage.setItem('byrding:user:age', '99')

    const plugin = persistPlugin({ storage, keys: ['name'] })
    const handle = createStore('user', () => {
      const s = {
        name: 'alice',
        age: 30,
        setName(n: string) { s.name = n },
        plugins: [plugin],
      }
      return s
    })

    expect(handle.store.name).toBe('bob')
    expect(handle.store.age).toBe(30)
  })

  test('rehydration does not trigger onStateChange', () => {
    const storage = makeStorage()
    storage.setItem('byrding:counter:count', '5')

    const stateChanges: string[] = []
    const logPlugin = {
      onStateChange(_storeId: string, path: string) { stateChanges.push(path) },
    }

    createStore('counter', () => {
      const s = { count: 0, plugins: [persistPlugin({ storage }), logPlugin] }
      return s
    })

    expect(stateChanges).toHaveLength(0)
  })

  test('no-ops gracefully when storage unavailable', () => {
    const plugin = persistPlugin({ storage: null as unknown as Storage })
    expect(() => {
      createStore('counter', () => {
        const s = { count: 0, plugins: [plugin] }
        return s
      })
    }).not.toThrow()
  })

  test('skips key on corrupt stored value', () => {
    const storage = makeStorage()
    storage.setItem('byrding:counter:count', 'not-valid-json{{')

    const plugin = persistPlugin({ storage })
    const handle = createStore('counter', () => {
      const s = { count: 0, plugins: [plugin] }
      return s
    })

    expect(handle.store.count).toBe(0)
  })

  test('rehydrates class-style store', () => {
    const storage = makeStorage()
    storage.setItem('byrding:cls:value', '"persisted"')

    const plugin = persistPlugin({ storage })

    class MyStore {
      value = 'initial'
      setValue(v: string) { (this as unknown as Record<string, unknown>)['value'] = v }
      static plugins = [plugin]
    }

    const handle = createStore('cls', MyStore)
    expect(handle.store.value).toBe('persisted')
  })

  test('stores allowlist — global plugin skips non-listed store in onInit', () => {
    const storage = makeStorage()
    storage.setItem('byrding:counter:count', '99')

    const plugin = persistPlugin({ storage, stores: ['user'] })

    const handle = createStore('counter', () => {
      const s = { count: 0, plugins: [plugin] }
      return s
    })

    expect(handle.store.count).toBe(0)
  })
})

// ─── integration — persist + rehydrate round-trip ────────────────────────────

describe('round-trip', () => {
  test('persisted value survives store re-registration', () => {
    const storage = makeStorage()
    const plugin = persistPlugin({ storage })

    const h1 = createStore('rt', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })
    h1.store.inc()
    h1.store.inc()
    expect(storage.getItem('byrding:rt:count')).toBe('2')

    resetRegistry()

    const h2 = createStore('rt', () => {
      const s = { count: 0, inc() { s.count++ }, plugins: [plugin] }
      return s
    })
    expect(h2.store.count).toBe(2)
  })
})
