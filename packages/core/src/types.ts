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

  /** Getter functions, each bound to `_proxy`. */
  _getterFns: Record<string, () => unknown>

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
