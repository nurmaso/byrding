/**
 * subscriptions.ts
 *
 * A key-path-aware subscription map that routes change notifications to:
 *
 *   1. Exact-match listeners  — subscribed to `"user.name"` receive updates
 *      only when `user.name` changes.
 *
 *   2. Ancestor listeners     — subscribed to `"user"` receive updates for
 *      any change under `user.*`.
 *
 *   3. Wildcard listeners     — subscribed to `"*"` receive every change.
 *
 * This makes it possible for framework adapters to subscribe globally (using
 * `subscribeAny`) and re-render when anything in the store changes, while
 * advanced consumers can subscribe to fine-grained paths for optimised
 * re-renders in the future.
 */

export type ChangeCallback = (
  keyPath: string,
  newValue: unknown,
  oldValue: unknown
) => void;

export type Unsubscribe = () => void;

export class SubscriptionMap {
  private readonly map = new Map<string, Set<ChangeCallback>>();

  /** Subscribe to a specific key path (or `"*"` for all changes). */
  subscribe(keyPath: string, callback: ChangeCallback): Unsubscribe {
    if (!this.map.has(keyPath)) {
      this.map.set(keyPath, new Set());
    }
    this.map.get(keyPath)!.add(callback);

    return () => {
      this.map.get(keyPath)?.delete(callback);
    };
  }

  /** Convenience: subscribe to every change in the store. */
  subscribeAny(callback: ChangeCallback): Unsubscribe {
    return this.subscribe('*', callback);
  }

  /**
   * Notify all relevant listeners when `keyPath` changes.
   *
   * Propagation order:
   *   1. Exact match (`"user.name"`)
   *   2. Every ancestor (`"user"`, then `""` root — skipped if empty)
   *   3. Wildcard (`"*"`)
   */
  notify(keyPath: string, newValue: unknown, oldValue: unknown): void {
    this._fire(keyPath, keyPath, newValue, oldValue);

    // Ancestor propagation: "user.address.city" → "user.address" → "user"
    const parts = keyPath.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const ancestor = parts.slice(0, i).join('.');
      this._fire(ancestor, keyPath, newValue, oldValue);
    }

    // Wildcard
    this._fire('*', keyPath, newValue, oldValue);
  }

  private _fire(
    listenKey: string,
    keyPath: string,
    newValue: unknown,
    oldValue: unknown
  ): void {
    this.map.get(listenKey)?.forEach((cb) => cb(keyPath, newValue, oldValue));
  }
}
