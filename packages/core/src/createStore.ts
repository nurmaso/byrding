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
 *
 * ## Instrumented exactly once
 *
 * `createStore` is called once per framework adapter (`@byrding/react` and
 * `@byrding/vue` each call it from `defineStore`) and again on every Vite HMR
 * re-evaluation.  Everything that wraps the instance — the `_notify` plugin /
 * snapshot-cache wrapper, the `onAction` wrapper around each action, and the
 * snapshot cache itself — therefore lives inside the registration branch and
 * on `StoreInstance`, never in this function's per-call closure.  Otherwise
 * each handle would stack another wrapper: plugin hooks would fire once per
 * handle, action references would differ between handles, and a `$patch`
 * through one handle would leave the others holding a stale snapshot.
 */

import { classify } from './classify.js'
import { createReactiveState, normaliseKeyPath } from './proxy.js'
import {
  subscribe,
  notify,
  pushEvaluatingStore,
  popEvaluatingStore,
  peekEvaluatingStore,
  registerCrossStoreDep,
  notifyCrossStoreDeps,
} from './subscriptions.js'
import { storeRegistry } from './registry.js'
import { coreStore, CoreStore } from './coreStore.js'
import { devWarn } from './devWarn.js'
import type { StoreInstance, StoreHandle, StateOf, ActionsOf, Plugin, UseStoreFn } from './types.js'

// Module-level flag: true only while a store factory or constructor is executing.
// Guards useStore() calls so they throw descriptively when used outside definition.
let _inDefinitionContext = false

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
 *
 * Exported so `makeUseStoreFn` can produce live merged-store references.
 */
export function buildMergedStore<T>(store: StoreInstance): T & { $reset(): void } {
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
      get: () => {
        pushEvaluatingStore(store.id)
        try { return store._getterFns[key]() }
        finally { popEvaluatingStore() }
      },
      enumerable: true,
    })
  }

  for (const key of store._accessorKeys) {
    Object.defineProperty(merged, key, {
      get: () => {
        pushEvaluatingStore(store.id)
        try { return store._accessorFns[key].get() }
        finally { popEvaluatingStore() }
      },
      set: (v) => { store._accessorFns[key].set(v) },
      enumerable: true,
    })
  }

  for (const key of store._actionKeys) {
    merged[key] = store._actionFns[key]
  }

  merged['$reset'] = () => {
    for (const key of store._stateKeys) {
      const initial = (store._initialRaw as Record<string, unknown>)[key]
      if ((store._raw as Record<string, unknown>)[key] !== initial) {
        store._proxy[key] = initial
      }
    }
  }

  return merged as T & { $reset(): void }
}

// ─── Inter-store composition ──────────────────────────────────────────────────

/**
 * Creates the `useStore` context function injected into each store factory or
 * constructor. Returns a lazy Proxy that resolves the target store from the
 * registry on first property access — supporting forward references.
 *
 * Each call returns a fresh context function so per-store proxy caches are
 * isolated and won't leak across registrations.
 */
export function makeUseStoreFn(): UseStoreFn {
  // Cache the merged store per target ID once resolved, so we don't rebuild
  // descriptors on every property read while still supporting forward refs.
  const mergedCache = new Map<string, Record<string, unknown>>()

  return <T extends Record<string, unknown>>(id: string): T => {
    if (!_inDefinitionContext) {
      throw new Error(
        `[byrding] useStore() may only be called inside a store factory function or class constructor. ` +
        `Store composition handles are not valid outside the definition phase.`
      )
    }

    return new Proxy({} as unknown as T, {
      get(_target, prop: string | symbol): unknown {
        if (typeof prop !== 'string') return undefined
        // Register a reactive dep edge when read inside a computed getter.
        // peekEvaluatingStore() is non-null only during buildMergedStore computed
        // accessor evaluation — never during action calls.
        const evaluatingId = peekEvaluatingStore()
        if (evaluatingId !== undefined && evaluatingId !== id) {
          registerCrossStoreDep(evaluatingId, id)
        }
        if (!mergedCache.has(id)) {
          const inst = storeRegistry.get(id)
          if (!inst) {
            throw new Error(
              `[byrding] useStore('${id}'): store "${id}" is not yet registered. ` +
              `Forward references are supported — ensure "${id}" is defined before this handle is first accessed.`
            )
          }
          mergedCache.set(id, buildMergedStore(inst) as Record<string, unknown>)
        }
        return mergedCache.get(id)![prop]
      },
      set(_target, prop: string | symbol, value: unknown): boolean {
        if (typeof prop !== 'string') return false
        if (!mergedCache.has(id)) {
          const inst = storeRegistry.get(id)
          if (!inst) return false
          mergedCache.set(id, buildMergedStore(inst) as Record<string, unknown>)
        }
        mergedCache.get(id)![prop] = value
        return true
      },
    })
  }
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

    // Build the useStore context fn for inter-store composition (issue #81).
    // Passed as first arg to factory functions and class constructors.
    // Backward compatible: existing no-arg factories/constructors ignore it.
    const useStoreCtx = makeUseStoreFn()
    _inDefinitionContext = true
    let instance: T
    try {
      instance = usingClass
        ? new (definition as new (useStore: UseStoreFn) => T)(useStoreCtx)
        : (definition as (useStore: UseStoreFn) => T)(useStoreCtx)
    } finally {
      _inDefinitionContext = false
    }

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

    const { stateKeys, actionKeys, computedKeys, accessorKeys } = classify(instance)
    const proto = Object.getPrototypeOf(instance)
    const hasProto = proto && proto !== Object.prototype

    // Placeholder; filled below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeInstance: StoreInstance<StateOf<T>, ActionsOf<T>> = {
      id,
      _raw: {} as StateOf<T>,
      _initialRaw: {} as StateOf<T>,
      _proxy: null as unknown as Record<string, unknown>,
      _stateKeys: stateKeys,
      _actionKeys: actionKeys,
      _computedKeys: computedKeys,
      _accessorKeys: accessorKeys,
      _getterFns: {},
      _accessorFns: {},
      _actionFns: {} as ActionsOf<T>,
      _updateMap: new Map(),
      _callbackMap: new Map(),
      _notify: (keyPath, _oldValue, _newValue) => notify(storeInstance, keyPath),
      _localPlugins: localPlugins,
      _core: activeCore,
      _snapshotCache: null,
      _definition: definition,
    }

    if (usingClass) {
      // ── Class strategy: Proxy over a plain _raw copy ───────────────────────
      const raw = {} as StateOf<T>
      for (const key of stateKeys) {
        (raw as Record<string, unknown>)[key] = (instance as Record<string, unknown>)[key]
      }
      storeInstance._raw = raw
      storeInstance._initialRaw = { ...raw } as StateOf<T>
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
      storeInstance._initialRaw = { ...raw } as StateOf<T>
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
            if (typeof key === 'string') {
              const getter = storeInstance._getterFns[key]
              if (getter) return getter()
              const accessor = storeInstance._accessorFns[key]
              if (accessor) return accessor.get()
            }
            return Reflect.get(target, key)
          },
          set(target, key: string, value: unknown) {
            if (typeof key === 'string') {
              const accessor = storeInstance._accessorFns[key]
              if (accessor) {
                accessor.set(value)
                return true
              }
            }
            return Reflect.set(target, key, value)
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

    // ── Bind accessor state (get+set pairs) ──────────────────────────────────
    //
    // Class:   getter/setter on the prototype, both bound to `bindTarget` so
    //          `this._celsius` reads/writes through the proxy.  The wrapped set
    //          also fires `_notify` for the accessor key itself so subscribers
    //          to that key path are notified on write.
    // Closure: preserve the original get/set descriptor; redefine the property
    //          with a wrapped setter that fires `_notify` after the original
    //          setter runs (the original setter updates the closed-over variable
    //          but never notifies subscribers).
    for (const key of accessorKeys) {
      const descriptor =
        Object.getOwnPropertyDescriptor(instance, key) ??
        (hasProto ? Object.getOwnPropertyDescriptor(proto, key) : undefined)
      if (!descriptor?.get || !descriptor?.set) continue

      if (usingClass) {
        const boundGet = descriptor.get.bind(bindTarget)
        const boundSet = descriptor.set.bind(bindTarget)
        storeInstance._accessorFns[key] = {
          get: boundGet,
          set: (v: unknown) => {
            const oldValue = boundGet()
            boundSet(v)
            const newValue = boundGet()
            storeInstance._notify(key, oldValue, newValue)
          },
        }
      } else {
        const inst = instance as Record<string, unknown>
        const origGet = descriptor.get
        const origSet = descriptor.set
        const wrappedSet = (v: unknown) => {
          const oldValue = origGet.call(inst)
          origSet.call(inst, v)
          const newValue = origGet.call(inst)
          storeInstance._notify(key, oldValue, newValue)
        }
        Object.defineProperty(inst, key, {
          get: origGet,
          set: wrappedSet,
          enumerable: true,
          configurable: true,
        })
        storeInstance._accessorFns[key] = {
          get: () => origGet.call(inst),
          set: wrappedSet,
        }
      }
    }

    // ── Notification wrapper ─────────────────────────────────────────────────
    //
    // Every mutation flows through `_notify`.  The wrapper, in order:
    //   1. invalidates the shared snapshot cache — React's
    //      `useSyncExternalStore` requires `getSnapshot()` to return the SAME
    //      reference between mutations and a new one after each real change;
    //   2. runs plugin `onStateChange` hooks — the registering core's global
    //      plugins first, then this store's per-store plugins;
    //   3. fires this store's own subscribers (the original `_notify`);
    //   4. propagates to stores whose computed getters read this one.
    //
    // This runs inside the registration branch so it is applied exactly once
    // per id, however many handles are created (see the header comment).
    const originalNotify = storeInstance._notify
    storeInstance._notify = (keyPath: string, oldValue?: unknown, newValue?: unknown) => {
      storeInstance._snapshotCache = null
      const path = normaliseKeyPath(keyPath)
      storeInstance._core.runOnStateChange(id, path, newValue, oldValue)
      for (const p of localPlugins) p.onStateChange?.(id, path, newValue, oldValue)
      originalNotify(keyPath, oldValue, newValue)
      notifyCrossStoreDeps(id, (targetId) => storeRegistry.get(targetId))
    }

    // ── Action wrapper ───────────────────────────────────────────────────────
    //
    // Runs plugin `onAction` hooks before the bound action.  Also once per id,
    // so `handle.store.someAction` is reference-identical across handles.
    for (const key of actionKeys) {
      const original = (storeInstance._actionFns as Record<string, unknown>)[key] as (...args: unknown[]) => unknown
      ;(storeInstance._actionFns as Record<string, unknown>)[key] = (...args: unknown[]) => {
        storeInstance._core.runOnAction(id, key, args)
        for (const p of localPlugins) p.onAction?.(id, key, args)
        return original(...args)
      }
    }

    storeRegistry.set(id, storeInstance)
    const initSnapshot = { ...storeInstance._raw } as Record<string, unknown>
    for (const key of storeInstance._accessorKeys) {
      initSnapshot[key] = storeInstance._accessorFns[key].get()
    }
    storeInstance._core.runOnInit(id, initSnapshot)
    for (const p of localPlugins) p.onInit?.(id, initSnapshot as StateOf<T>)
  }

  const store = storeRegistry.get(id)!

  // First registration wins, and the discarded `definition` is only worth a
  // warning when it is a DIFFERENT function reference.  The same reference
  // arriving again is the normal path — React and Vue adapters both calling
  // `defineStore` with one exported definition, or a Vite HMR re-evaluation
  // of an unchanged module — and warning there would be noise that trains
  // developers to ignore the warning that matters: a test that forgot
  // `resetRegistry()`, or an edited definition under HMR that will never take
  // effect.  `devWarn` dedupes, so a given id warns at most once per session.
  if (definition !== store._definition) {
    devWarn(
      `createStore('${id}'): a different definition was passed than the one that registered this id. ` +
      `First registration wins — the later definition is ignored. ` +
      `Use a distinct id, or call resetRegistry() between tests, if a new definition is intended.`,
    )
  }

  // Likewise for `options.core`: the core that registered the id is the only
  // one whose global plugins ever run for this store.  A later call resolving
  // a different core (an explicit `options.core`, or the global default when
  // the first call passed a custom one) is a silent configuration mistake, so
  // surface it once in development.
  if (activeCore !== store._core) {
    devWarn(
      `createStore('${id}'): a different \`options.core\` was passed than the one that registered this id. ` +
      `First registration wins — plugins on the later core will not run for this store.`,
    )
  }

  const mergedStore = buildMergedStore<T>(store)

  // $patch — batch update with a single subscriber notification.
  // State keys: written directly to _raw (bypassing per-key proxy notify) so
  // the final notify('*') is the only subscriber callsite.
  // Accessor keys: must go through their setter (the setter owns transform +
  // notify), so they each fire individually before the trailing notify('*').
  ;(mergedStore as Record<string, unknown>)['$patch'] = (partial: Partial<StateOf<T>>) => {
    const raw = store._raw as Record<string, unknown>
    const changes: Array<{ key: string; old: unknown; new: unknown }> = []

    for (const key of store._stateKeys) {
      if (!Object.prototype.hasOwnProperty.call(partial, key)) continue
      const newVal = (partial as Record<string, unknown>)[key]
      const oldVal = raw[key]
      if (oldVal === newVal) continue
      raw[key] = newVal
      changes.push({ key, old: oldVal, new: newVal })
    }

    for (const key of store._accessorKeys) {
      if (!Object.prototype.hasOwnProperty.call(partial, key)) continue
      const newVal = (partial as Record<string, unknown>)[key]
      store._accessorFns[key].set(newVal)
    }

    if (changes.length === 0) return

    store._snapshotCache = null

    for (const { key, old: oldVal, new: newVal } of changes) {
      store._core.runOnStateChange(id, key, newVal, oldVal)
      for (const p of store._localPlugins) p.onStateChange?.(id, key, newVal, oldVal)
    }

    notify(store, '*')
    notifyCrossStoreDeps(id, (targetId) => storeRegistry.get(targetId))
  }

  return {
    store: mergedStore as T & { $reset(): void; $patch(partial: Partial<StateOf<T>>): void },

    subscribe(componentId, keyPaths, callback) {
      return subscribe(store, componentId, keyPaths, callback)
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSnapshot(): any {
      if (!store._snapshotCache) {
        const snapshot: Record<string, unknown> = { ...store._raw }
        for (const key of store._accessorKeys) {
          snapshot[key] = store._accessorFns[key].get()
        }
        store._snapshotCache = snapshot
      }
      return store._snapshotCache
    },
  }
}
