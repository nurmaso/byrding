/**
 * types.ts
 *
 * Shared TypeScript types for @byrding/core.
 *
 * `StoreInstance` is the internal representation of a registered store.
 * Framework adapters consume only `StoreHandle<T>` — the public surface that
 * `createStore` returns.
 */

// ─── Type helpers ─────────────────────────────────────────────────────────────

/** Extract the non-function (state) properties of T. */
export type StateOf<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K]
}

/** Extract the function (action) properties of T. */
export type ActionsOf<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K]
}

/** Merge state, actions, and computed into the flat consumer-facing type. */
export type MergedStore<S, A, C = Record<never, never>> = S & A & C & {
  $reset(): void
  $patch(partial: Partial<S>): void
}

// ─── Internal store shape ────────────────────────────────────────────────────

/**
 * The subset of `CoreStore` a registered store needs at runtime.
 *
 * Declared structurally here rather than imported from `coreStore.ts`, which
 * itself imports this file for `Plugin` — keeping `types.ts` dependency-free.
 */
export interface StoreCoreHooks {
  runOnInit(storeId: string, snapshot: Record<string, unknown>): void
  runOnStateChange(storeId: string, path: string, next: unknown, prev: unknown): void
  runOnAction(storeId: string, actionName: string, args: unknown[]): void
  runOnDispose(storeId: string): void
}

export interface StoreInstance<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TActions extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Unique name registered in the store registry. */
  id: string

  /**
   * Raw state values — plain object, no proxy.
   * `getSnapshot()` spreads this to produce a stable snapshot reference.
   */
  _raw: TState

  /**
   * Shallow snapshot of initial state captured at registration time.
   * Used by `$reset()` to restore all state keys to their starting values.
   */
  _initialRaw: TState

  /**
   * Reactive surface:
   *   Class  — a `Proxy` over `_raw`; actions are bound here so `this.x = v`
   *            goes through the proxy set trap → notification.
   *   Closure — the factory instance instrumented with reactive
   *            `Object.defineProperty` setters; mutations from the closure
   *            variable (`store.x = v`) trigger the setter → notification.
   */
  _proxy: Record<string, unknown>

  _stateKeys: string[]
  _actionKeys: string[]
  _computedKeys: string[]
  _accessorKeys: string[]

  /** Getter functions, each bound to `_proxy`. */
  _getterFns: Record<string, () => unknown>

  /** Accessor get/set pairs for properties with both a getter and a setter. */
  _accessorFns: Record<string, { get: () => unknown; set: (v: unknown) => void }>

  /** Action functions, each bound to `_proxy` and typed against TActions. */
  _actionFns: TActions

  /**
   * Update map — `keyPath → Set<componentId>`.
   * Tracks which component IDs are subscribed to which key paths.
   */
  _updateMap: Map<string, Set<string>>

  /**
   * Callback map — `componentId → () => void`.
   * Holds the notification callback for each subscribed component.
   */
  _callbackMap: Map<string, () => void>

  /**
   * Fires subscriber callbacks for the given key path.
   * `oldValue` and `newValue` are forwarded to plugin hooks for
   * state:change events; they are not used by the subscription system itself.
   */
  _notify: (keyPath: string, oldValue?: unknown, newValue?: unknown) => void

  /**
   * Per-store plugins extracted from the definition at registration time.
   * Class style: read from `static plugins` on the constructor.
   * Closure style: read from the `plugins` key on the returned instance
   * (removed before classify so it is never treated as reactive state).
   * Run after the active global CoreStore's hooks, global-first order.
   */
  _localPlugins: Plugin[]

  /**
   * The CoreStore whose global plugins run for this store — the one resolved
   * by the `createStore` call that registered the id.  Later calls for the
   * same id that resolve a different core are ignored (first registration
   * wins) and warned about in development.
   */
  _core: StoreCoreHooks

  /**
   * Last `getSnapshot()` result, or `null` when invalidated.
   *
   * Lives on the instance — not in a per-`createStore`-call closure — so every
   * handle for this id shares one cache.  React's `useSyncExternalStore` then
   * sees a single stable reference between mutations and a single new
   * reference after one, regardless of which handle (or which store, via
   * cross-store propagation) caused the change.
   */
  _snapshotCache: Record<string, unknown> | null

  /**
   * The class constructor or factory function that registered this id.
   *
   * Kept only for identity comparison: a later `createStore` call for the
   * same id with the SAME reference is the normal React + Vue / HMR path and
   * stays silent, while a DIFFERENT reference (a test that forgot
   * `resetRegistry()`, an edited definition under HMR) is warned about in
   * development.  First registration wins either way.
   */
  _definition: Function
}

// ─── Inter-store composition ─────────────────────────────────────────────────

/**
 * Context function passed as the first argument to closure factory functions
 * and class constructors. Returns a live lazy proxy for the target store.
 *
 * The proxy resolves from the registry on first property access, so forward
 * references (using a store that hasn't been registered yet) are supported as
 * long as the target store is registered before any property is first read.
 *
 * May only be called during store definition (inside a factory or constructor).
 * Throws if called after the definition phase is complete.
 */
export type UseStoreFn = <T extends Record<string, unknown>>(id: string) => T

// ─── Plugin system ───────────────────────────────────────────────────────────

export interface Plugin<S extends Record<string, unknown> = Record<string, unknown>> {
  onInit?(storeId: string, snapshot: S): void
  onStateChange?(storeId: string, path: string, next: unknown, prev: unknown): void
  onAction?(storeId: string, actionName: string, args: unknown[]): void
  onDispose?(storeId: string): void
}

export type PluginFactory<S extends Record<string, unknown> = Record<string, unknown>> =
  (...args: unknown[]) => Plugin<S>

// ─── Framework-adapter surface ───────────────────────────────────────────────

/**
 * What `createStore` returns. Framework adapters (`@byrding/react`,
 * `@byrding/vue`) consume this interface and never import `StoreInstance`
 * directly.
 *
 * App developers never import from `@byrding/core` — they use the framework
 * package's `defineStore` exclusively.
 */
export interface StoreHandle<T> {
  /** The flat merged store object — state, computed, actions, $reset(), and $patch() top-level. */
  store: T & { $reset(): void; $patch(partial: Partial<StateOf<T>>): void }

  /**
   * Register a component subscriber for the given key paths.
   * Pass `['*']` to subscribe to any change.
   * Returns an unsubscribe function.
   */
  subscribe: (
    componentId: string,
    keyPaths: string[],
    callback: () => void
  ) => () => void

  /**
   * Returns a shallow copy of raw state only (no actions, no computed).
   * Used by React's `useSyncExternalStore` to detect whether a re-render is
   * needed. Returns the same cached reference between mutations; a new object
   * on each mutation so React detects the change.
   */
  getSnapshot: () => StateOf<T>
}
