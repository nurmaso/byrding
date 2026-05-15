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
import { createReactiveState, normaliseKeyPath } from './proxy.js'
import { subscribe, notify } from './subscriptions.js'
import { storeRegistry } from './registry.js'
import { coreStore, CoreStore } from './coreStore.js'
import type { StoreInstance, StoreHandle, StateOf, ActionsOf, Plugin } from './types.js'

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
 * Create (or retrieve) the store for `id` and return a `StoreHandle` that
 * framework adapters can consume.
 *
 * Two overloads allow TypeScript to infer state and action types precisely:
 *   - Class constructor → `StateOf<InstanceType<C>> & ActionsOf<InstanceType<C>>`
 *   - Factory function  → `T` (the factory's return type, already merged)
 *
 * @param id         Unique store name.
 * @param definition A class constructor **or** a factory function.
 * @param options    Optional. Pass `core` to use an isolated CoreStore instance
 *                   instead of the global singleton — global plugins will NOT
 *                   run for this store.
 */
export function createStore<C extends new () => object>(
  id: string,
  definition: C,
  options?: { core?: CoreStore },
): StoreHandle<StateOf<InstanceType<C>> & ActionsOf<InstanceType<C>>>
export function createStore<T extends Record<string, unknown>>(
  id: string,
  definition: () => T,
  options?: { core?: CoreStore },
): StoreHandle<T>
export function createStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
  options?: { core?: CoreStore },
): StoreHandle<T>
export function createStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
  options?: { core?: CoreStore },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): StoreHandle<any> {

  // Always mark the global singleton as initialized so configureByrding throws
  // if called after any store has been created — even stores using an injected core.
  coreStore.markInitialized()
  const activeCore = options?.core ?? coreStore

  // ── Lazy singleton initialisation ─────────────────────────────────────────
  if (!storeRegistry.has(id)) {
    const usingClass = isClass(definition)

    const instance: T = usingClass
      ? new (definition as new () => T)()
      : (definition as () => T)()

    // Extract per-store plugins before classify runs so that `plugins` is never
    // bucketed as a state key.  For class style, read the static property off the
    // constructor; for closure style, read and delete the instance property.
    const localPlugins: Plugin[] = []
    if (usingClass) {
      const sp = (definition as unknown as { plugins?: Plugin[] }).plugins
      if (Array.isArray(sp)) localPlugins.push(...sp)
    } else {
      const inst = instance as Record<string, unknown>
      if (Array.isArray(inst['plugins'])) {
        localPlugins.push(...(inst['plugins'] as Plugin[]))
        delete inst['plugins']
      }
    }

    const { stateKeys, actionKeys, computedKeys } = classify(instance)
    const proto = Object.getPrototypeOf(instance)
    const hasProto = proto && proto !== Object.prototype

    // Placeholder; filled below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeInstance: StoreInstance<StateOf<T>, ActionsOf<T>> = {
      id,
      _raw: {} as StateOf<T>,
      _proxy: null as unknown as Record<string, unknown>,
      _stateKeys: stateKeys,
      _actionKeys: actionKeys,
      _computedKeys: computedKeys,
      _getterFns: {},
      _actionFns: {} as ActionsOf<T>,
      _updateMap: new Map(),
      _callbackMap: new Map(),
      _notify: (keyPath, _oldValue, _newValue) => notify(storeInstance, keyPath),
      _localPlugins: localPlugins,
    }

    if (usingClass) {
      // ── Class strategy: Proxy over a plain _raw copy ───────────────────────
      const raw = {} as StateOf<T>
      for (const key of stateKeys) {
        (raw as Record<string, unknown>)[key] = (instance as Record<string, unknown>)[key]
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
      const raw = {} as StateOf<T>
      const inst = instance as Record<string, unknown>

      for (const key of stateKeys) {
        (raw as Record<string, unknown>)[key] = inst[key]
        Object.defineProperty(inst, key, {
          get: () => (raw as Record<string, unknown>)[key],
          set: (v: unknown) => {
            const oldValue = (raw as Record<string, unknown>)[key]
            ;(raw as Record<string, unknown>)[key] = v
            storeInstance._notify(key, oldValue, v)
          },
          enumerable: true,
          configurable: true,
        })
      }

      storeInstance._raw = raw
      storeInstance._proxy = inst
    }

    // ── Computed-aware binding target (class style only) ──────────────────────
    //
    // Class getters bound to `_proxy` can call each other via `this`, e.g.
    // `total` doing `this.subtotal`.  `_proxy` wraps only `_raw` (state keys),
    // so `this.subtotal` would return `undefined` → NaN.  We create a thin
    // wrapper that intercepts reads of computed keys and routes them through
    // `_getterFns`, while all state reads/writes still flow through `_proxy`.
    //
    // For closure style `_proxy` IS the instrumented instance whose own getters
    // already close over the right reference — no wrapper needed.
    const bindTarget: Record<string, unknown> = usingClass
      ? new Proxy(storeInstance._proxy, {
          get(target, key: string) {
            const fn = storeInstance._getterFns[key]
            if (typeof key === 'string' && fn) return fn()
            return Reflect.get(target, key)
          },
        })
      : storeInstance._proxy

    // ── Bind actions ─────────────────────────────────────────────────────────
    //
    // Class:   bind to `bindTarget` so `this.count++` goes through the Proxy
    //          set trap → notification, and `this.computedKey` resolves via
    //          `_getterFns` instead of returning undefined from `_raw`.
    // Closure: bind is effectively a no-op for `this`, but we bind anyway so
    //          the function runs in the correct context.  The closure variable
    //          already points to the instrumented instance.
    for (const key of actionKeys) {
      const fn: Function = hasProto
        ? (Object.getOwnPropertyDescriptor(proto, key)?.value ??
          (instance as Record<string, unknown>)[key])
        : (instance as Record<string, unknown>)[key]
      ;(storeInstance._actionFns as Record<string, unknown>)[key] = (fn as (...a: unknown[]) => unknown).bind(
        bindTarget,
      )
    }

    // ── Bind getters ─────────────────────────────────────────────────────────
    //
    // Class:   getter on the prototype, bound to `bindTarget` so `this.count`
    //          reads through the Proxy and `this.otherGetter` resolves via
    //          `_getterFns`.
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
        storeInstance._getterFns[key] = descriptor.get.bind(bindTarget)
      }
    }

    storeRegistry.set(id, storeInstance)
    activeCore.runOnInit(id, { ...storeInstance._raw })
    for (const p of localPlugins) p.onInit?.(id, storeInstance._raw)
  }

  // ── Snapshot caching ──────────────────────────────────────────────────────
  //
  // React's `useSyncExternalStore` requires that `getSnapshot()` returns the
  // SAME reference between mutations.  We cache the last snapshot and
  // invalidate it on every notification so only a real change produces a new
  // object reference.
  const store = storeRegistry.get(id)!

  const originalNotify = store._notify
  let _snapshotCache: Record<string, unknown> | null = null
  store._notify = (keyPath: string, oldValue?: unknown, newValue?: unknown) => {
    _snapshotCache = null
    activeCore.runOnStateChange(id, normaliseKeyPath(keyPath), newValue, oldValue)
    for (const p of store._localPlugins) p.onStateChange?.(id, normaliseKeyPath(keyPath), newValue, oldValue)
    originalNotify(keyPath, oldValue, newValue)
  }

  for (const key of store._actionKeys) {
    const original = store._actionFns[key] as (...args: unknown[]) => unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store._actionFns[key] = ((...args: unknown[]) => {
      activeCore.runOnAction(id, key, args)
      for (const p of store._localPlugins) p.onAction?.(id, key, args)
      return original(...args)
    }) as any
  }

  const mergedStore = buildMergedStore<T>(store)

  return {
    store: mergedStore,

    subscribe(componentId, keyPaths, callback) {
      return subscribe(store, componentId, keyPaths, callback)
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSnapshot(): any {
      if (!_snapshotCache) {
        _snapshotCache = { ...store._raw }
      }
      return _snapshotCache
    },
  }
}
