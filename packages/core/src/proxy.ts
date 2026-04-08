/**
 * proxy.ts
 *
 * Wraps a store instance in a recursive Proxy so that any property assignment
 * — no matter how deeply nested — triggers a change notification with the
 * full key path (e.g. `"user.address.city"`).
 *
 * Design notes:
 * - `Reflect.get(target, prop, receiver)` is used so that prototype getters
 *   and class methods receive the **proxy** as `this`, which means:
 *     • Getters re-evaluate through the proxy (full reactivity).
 *     • Action methods access `this.prop` through the proxy and therefore
 *       trigger the `set` trap when they mutate state.
 * - Symbol properties are forwarded without interception to avoid breaking
 *   built-in iteration protocols (`Symbol.iterator`, etc.).
 * - Array index normalisation: numeric string keys (e.g. `"0"`) are kept as
 *   strings in the key path so consumers can match them as `"list.0"`.
 */

export type ChangeHandler = (
  keyPath: string,
  newValue: unknown,
  oldValue: unknown
) => void;

/**
 * Creates a deep reactive Proxy around `target`.
 *
 * @param target   The raw object to proxy (class instance or plain object).
 * @param onChange Called whenever a property is set anywhere in the tree.
 * @param keyPath  Internal — dot-separated path prefix for nested proxies.
 */
export function createReactiveProxy<T extends object>(
  target: T,
  onChange: ChangeHandler,
  keyPath = ''
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      // Let symbols pass through untouched.
      if (typeof prop === 'symbol') {
        return Reflect.get(obj, prop, receiver);
      }

      // Use Reflect.get with receiver so prototype getters / class methods
      // execute with `this === proxy`.
      const value = Reflect.get(obj, prop, receiver);

      // Recursively proxy nested objects so deep mutations are tracked.
      if (typeof value === 'object' && value !== null) {
        const nestedPath = keyPath ? `${keyPath}.${prop}` : prop;
        return createReactiveProxy(value as object, onChange, nestedPath);
      }

      return value;
    },

    set(obj, prop, value, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.set(obj, prop, value, receiver);
      }

      const oldValue = Reflect.get(obj, prop, receiver);
      const result = Reflect.set(obj, prop, value, receiver);

      if (result && !Object.is(oldValue, value)) {
        const fullPath = keyPath ? `${keyPath}.${prop}` : prop;
        onChange(fullPath, value, oldValue);
      }

      return result;
    },
  });
}
