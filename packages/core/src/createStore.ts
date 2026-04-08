/**
 * createStore.ts
 *
 * Singleton registry and flat store object builder.
 *
 * Each named store is created only once (first `getOrCreateStore` call for a
 * given `id`).  Subsequent calls return the same entry so every framework
 * adapter — React hook, Vue composable, or plain vanilla JS — shares the
 * exact same reactive proxy and subscription map.
 *
 * The returned `StoreEntry` exposes:
 *   - `store`        — the flat reactive proxy (read / write directly)
 *   - `subscribe`    — register a listener called whenever *anything* changes
 *   - `getVersion`   — monotonically increasing integer; frameworks can use
 *                      this as the `useSyncExternalStore` snapshot so that
 *                      React detects changes without deep equality checks
 */

import { classify, type StoreDef } from './classify.js';
import { createReactiveProxy } from './proxy.js';
import { SubscriptionMap } from './subscriptions.js';

export interface StoreEntry<T extends object> {
  /** The reactive proxy — same reference across all consumers. */
  readonly store: T;
  /**
   * Subscribe to any change.  Returns an unsubscribe function.
   * The callback receives no arguments — use `store` to read the latest value.
   */
  subscribe(listener: () => void): () => void;
  /** Monotonically increasing version number, bumped on every mutation. */
  getVersion(): number;
}

// Module-level registry shared across all packages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, StoreEntry<any>>();

/**
 * Returns the existing store entry for `id`, or creates a new one from
 * `definition` (a class constructor or factory function).
 *
 * The `definition` is only evaluated once — on first access.
 */
export function getOrCreateStore<T extends object>(
  id: string,
  definition: StoreDef<T>
): StoreEntry<T> {
  if (registry.has(id)) {
    return registry.get(id) as StoreEntry<T>;
  }

  const subscriptions = new SubscriptionMap();
  let version = 0;
  const listeners = new Set<() => void>();

  // Instantiate the store (class or factory).
  const instance = classify<T>(definition);

  // Wrap in a recursive reactive proxy.
  const store = createReactiveProxy<T>(instance, (keyPath, newValue, oldValue) => {
    version++;
    subscriptions.notify(keyPath, newValue, oldValue);
    listeners.forEach((cb) => cb());
  });

  const entry: StoreEntry<T> = {
    store,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion() {
      return version;
    },
  };

  registry.set(id, entry);
  return entry;
}

/**
 * Remove a store from the registry.  Useful for testing or SSR teardown.
 */
export function deleteStore(id: string): void {
  registry.delete(id);
}
