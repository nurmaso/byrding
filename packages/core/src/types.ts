/**
 * types.ts
 *
 * Shared TypeScript types for @byrding/core.
 *
 * `StoreInstance` is the internal representation of a registered store.
 * Framework adapters consume only `CoreStore<T>` — the public surface that
 * `createStore` returns.
 */

// ─── Internal store shape ────────────────────────────────────────────────────

export interface StoreInstance {
  /** Unique name registered in the store registry. */
  id: string

  /**
   * Raw state values — plain object, no proxy.
   * `getSnapshot()` spreads this to produce a stable snapshot reference.
   */
  _raw: Record<string, unknown>

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

  /** Action functions, each bound to `_proxy`. */
  _actionFns: Record<string, (...args: unknown[]) => unknown>

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
   * `oldValue` and `newValue` are forwarded to the devtools hook for
   * state:change events; they are not used by the subscription system itself.
   */
  _notify: (keyPath: string, oldValue?: unknown, newValue?: unknown) => void
}

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
export interface CoreStore<T> {
  /** The flat merged store object — state, computed, and actions top-level. */
  store: T

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
   * Returns a shallow copy of raw state.  Used by React's
   * `useSyncExternalStore` to detect whether a re-render is needed.
   * Returns the same cached reference between mutations; a new object on
   * each mutation so React detects the change.
   */
  getSnapshot: () => Partial<T>
}
