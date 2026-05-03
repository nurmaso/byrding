/**
 * proxy.ts
 *
 * Proxy-based change detection for class-style stores.
 *
 * `createReactiveState` wraps `_raw` (the plain state object) in a Proxy.
 * Class actions are **bound to this Proxy**, so `this.count++` inside an
 * action goes through the `set` trap → `notify` fires.
 *
 * Nested plain objects are recursively proxied (dot-path tracking).
 * Arrays are **not** recursively proxied — their elements and length are
 * collapsed to the parent array path before notification (see
 * `normaliseKeyPath`).
 */

export function createReactiveState(
  target: Record<string, unknown>,
  notify: (keyPath: string, oldValue: unknown, newValue: unknown) => void,
  prefix = '',
): Record<string, unknown> {
  return new Proxy(target, {
    get(obj, key: string) {
      const value = obj[key]
      const path = prefix ? `${prefix}.${key}` : key

      // Recurse into nested plain objects only — arrays are left as-is so
      // that their mutation methods (push, splice, …) still work; individual
      // index/length writes are normalised in `subscriptions.notify`.
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
      ) {
        return createReactiveState(value as Record<string, unknown>, notify, path)
      }

      return value
    },

    set(obj, key: string, value) {
      const oldValue = obj[key]
      obj[key] = value
      const path = prefix ? `${prefix}.${key}` : key
      notify(path, oldValue, value)
      return true
    },
  })
}

/**
 * Collapses array index and `.length` writes to their parent path so that
 * `store._updateMap` entries like `"items"` are notified when an element or
 * the length changes.
 *
 * Examples:
 *   "items.0"       → "items"
 *   "items.length"  → "items"
 *   "user.name"     → "user.name"  (unchanged)
 */
export function normaliseKeyPath(keyPath: string): string {
  return keyPath.replace(/\.\d+$/, '').replace(/\.length$/, '')
}
