/**
 * createStore.ts
 *
 * Internal core primitive used by framework adapters.  App developers never
 * call this directly — they use the framework package's `defineStore`.
 *
 * ## Class vs closure reactive strategy
 *
 * **Class instances** — actions use `this`.  We copy state into `_raw`,
 * create `_proxy = new Proxy(_raw, ...)`, and bind all actions / getters to
 * `_proxy`.  Any `this.count++` in an action goes through the proxy `set`
 * trap → notification fires.
 *
 * **Closure instances** — actions close over the factory's `store` variable,
 * which IS the instance returned by the factory.  A Proxy over `_raw` would
 * never intercept writes coming from inside that closure.
 *
 * Fix: for closures we build a separate plain `raw` object to hold the state
 * values, then redefine each state property on the instance with an
 * `Object.defineProperty` getter/setter that reads/writes `raw` and calls
 * `notify`.  Because the closure variable is the instance (= `_proxy`), any
 * `store.count = v` inside an action now goes through the reactive setter →
 * notification fires, and `_raw` stays in sync for `getSnapshot`.
 *
 * ## Singleton guarantee
 *
 * The first call for a given `id` instantiates and registers the store.
 * Subsequent calls return the existing singleton.  The second `definition`
 * argument is silently discarded — **first registration wins**.
 */

import { classify } from './classify.js'
import { createReactiveState } from './proxy.js'
import { subscribe, notify } from './subscriptions.js'
import { storeRegistry } from './registry.js'
import type { StoreInstance, CoreStore } from './types.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isClass(fn: Function): boolean {
  return /^\s*class\s/.test(fn.toString())
}

let _idCounter = 0

/** Generate a unique opaque ID for each component subscriber. */
export function generateComponentId(): string {
  return `byrding_${++_idCounter}`
}

// ─── Merged store object ─────────────────────────────────────────────────────

/**
 * Build the flat consumer-facing object from a registered `StoreInstance`.
 *
 * - **State** properties expose getter/setter so reads always return the
 *   current live value and writes go through the reactive surface.
 * - **Computed** properties expose a getter-only accessor that re-evaluates
 *   the bound getter function on every read (never cached).
 * - **Actions** are assigned directly as stable function references.
 */
function buildMergedStore<T>(store: StoreInstance): T {
  const merged: Record<string, unknown> = {}

  for (const key of store._stateKeys) {
    Object.defineProperty(merged, key, {
      get: () => store._proxy[key],
      set: (v) => {
        store._proxy[key] = v
      },
      enumerable: true,
    })
  }

  for (const key of store._computedKeys) {
    Object.defineProperty(merged, key, {
      get: () => store._getterFns[key](),
      enumerable: true,
    })
  }

  for (const key of store._actionKeys) {
    merged[key] = store._actionFns[key]
  }

  return merged as T
}

// ─── Core primitive ──────────────────────────────────────────────────────────

/**
 * Create (or retrieve) the store for `id` and return a `CoreStore<T>` that
 * framework adapters can consume.
 *
 * @param id         Unique store name.
 * @param definition A class constructor **or** a factory function.
 */
export function createStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
): CoreStore<T> {

  // ── Lazy singleton initialisation ─────────────────────────────────────────
  if (!storeRegistry.has(id)) {
    const usingClass = isClass(definition)

    const instance: T = usingClass
      ? new (definition as new () => T)()
      : (definition as () => T)()

    const { stateKeys, actionKeys, computedKeys } = classify(instance)
    const proto = Object.getPrototypeOf(instance)
    const hasProto = proto && proto !== Object.prototype

    // Placeholder; filled below.
    const storeInstance: StoreInstance = {
      id,
      _raw: {} as Record<string, unknown>,
      _proxy: null as unknown as Record<string, unknown>,
      _stateKeys: stateKeys,
      _actionKeys: actionKeys,
      _computedKeys: computedKeys,
      _getterFns: {},
      _actionFns: {},
      _updateMap: new Map(),
      _callbackMap: new Map(),
      _notify: (keyPath) => notify(storeInstance, keyPath),
    }

    if (usingClass) {
      // ── Class strategy: Proxy over a plain _raw copy ───────────────────────
      const raw: Record<string, unknown> = {}
      for (const key of stateKeys) {
        raw[key] = (instance as Record<string, unknown>)[key]
      }
      storeInstance._raw = raw
      storeInstance._proxy = createReactiveState(raw, (path) => storeInstance._notify(path))

    } else {
      // ── Closure strategy: reactive setters on the instance ─────────────────
      //
      // The closure variable (the `store` inside the factory) IS the instance.
      // We cannot replace that reference from outside. Instead, we redefine
      // each state property on the instance with a getter/setter that reads
      // from / writes to a plain `raw` values map and calls `_notify`.
      // `_raw` = the plain values map (used for getSnapshot).
      // `_proxy` = the instrumented instance (used for action/getter binding).
      const raw: Record<string, unknown> = {}
      const inst = instance as Record<string, unknown>

      for (const key of stateKeys) {
        raw[key] = inst[key]
        Object.defineProperty(inst, key, {
          get: () => raw[key],
          set: (v: unknown) => {
            raw[key] = v
            storeInstance._notify(key)
          },
          enumerable: true,
          configurable: true,
        })
      }

      storeInstance._raw = raw
      storeInstance._proxy = inst
    }

    // ── Bind actions ─────────────────────────────────────────────────────────
    //
    // Class:   bind to `_proxy` so `this.count++` goes through the Proxy set
    //          trap → notification.
    // Closure: bind is effectively a no-op for `this`, but we bind anyway so
    //          the function runs in the correct context.  The closure variable
    //          already points to the instrumented instance.
    for (const key of actionKeys) {
      const fn: Function = hasProto
        ? (Object.getOwnPropertyDescriptor(proto, key)?.value ??
          (instance as Record<string, unknown>)[key])
        : (instance as Record<string, unknown>)[key]
      storeInstance._actionFns[key] = (fn as (...a: unknown[]) => unknown).bind(
        storeInstance._proxy,
      )
    }

    // ── Bind getters ─────────────────────────────────────────────────────────
    //
    // Class:   getter on the prototype, bound to `_proxy` so `this.count`
    //          reads through the Proxy.
    // Closure: getter as own property, bound to `_proxy` (= instrumented
    //          instance).  The getter uses the closure variable which IS
    //          `_proxy`, so reads go through the reactive getter accessor.
    for (const key of computedKeys) {
      const descriptor =
        Object.getOwnPropertyDescriptor(instance, key) ??
        (hasProto
          ? Object.getOwnPropertyDescriptor(proto, key)
          : undefined)
      if (descriptor?.get) {
        storeInstance._getterFns[key] = descriptor.get.bind(storeInstance._proxy)
      }
    }

    storeRegistry.set(id, storeInstance)
  }

  // ── Snapshot caching ──────────────────────────────────────────────────────
  //
  // React's `useSyncExternalStore` requires that `getSnapshot()` returns the
  // SAME reference between mutations.  We cache the last snapshot and
  // invalidate it on every notification so only a real change produces a new
  // object reference.
  const store = storeRegistry.get(id)!

  // Wrap _notify to invalidate cache on each mutation.
  const originalNotify = store._notify
  let _snapshotCache: Partial<T> | null = null
  store._notify = (keyPath: string) => {
    _snapshotCache = null
    originalNotify(keyPath)
  }

  const mergedStore = buildMergedStore<T>(store)

  return {
    store: mergedStore,

    subscribe(componentId, keyPaths, callback) {
      return subscribe(store, componentId, keyPaths, callback)
    },

    getSnapshot() {
      if (!_snapshotCache) {
        _snapshotCache = { ...store._raw } as Partial<T>
      }
      return _snapshotCache
    },
  }
}
