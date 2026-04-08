/**
 * @bocal/vue — defineStore
 *
 * Returns a Vue 3 composable that exposes the store as a **flat** reactive
 * object.  No `state`, `actions`, or `getters` namespacing — everything is
 * top-level:
 *
 * ```ts
 * // Class style
 * class CounterStore {
 *   count = 0;
 *   get double() { return this.count * 2; }
 *   increment() { this.count++; }
 * }
 *
 * const useCounter = defineStore('counter', CounterStore);
 *
 * // Inside a component's setup():
 * const store = useCounter();
 * // store.count, store.double, store.increment() — all top-level
 * ```
 *
 * ## Reactivity model
 *
 * The store proxy lives in `@bocal/core` and is framework-agnostic.  To bridge
 * it into Vue's reactivity system we:
 *
 * 1. Create a `shallowRef` seeded with `0` (the store's version counter).
 * 2. Subscribe to any store change; on change we call `triggerRef` to force
 *    Vue to re-render all consumers of the composable — even though the
 *    underlying proxy reference hasn't changed.
 * 3. The subscription is torn down in `onUnmounted` to avoid leaks.
 *
 * The composable returns the raw proxy (not the ref), so template code accesses
 * `store.count` rather than `store.value.count`.
 */

import { shallowRef, triggerRef, onUnmounted } from 'vue';
import { getOrCreateStore } from '@bocal/core';
import type { StoreDef } from '@bocal/core';

/**
 * Define a store and get back a Vue 3 composable.
 *
 * @param id         Unique store identifier.
 * @param definition A class constructor *or* a factory function.
 * @returns          A composable `() => T` for use inside `setup()`.
 */
export function defineStore<T extends object>(
  id: string,
  definition: StoreDef<T>
): () => T {
  return function useStore(): T {
    const entry = getOrCreateStore<T>(id, definition);

    // A shallowRef used purely as a Vue reactivity trigger.  We never read
    // its `.value` for data — the actual data lives in `entry.store`.
    const versionRef = shallowRef(entry.getVersion());

    const unsubscribe = entry.subscribe(() => {
      versionRef.value = entry.getVersion();
      // triggerRef forces all computed / watchEffect / template consumers to
      // re-evaluate even when shallowRef doesn't detect a structural change.
      triggerRef(versionRef);
    });

    onUnmounted(unsubscribe);

    return entry.store;
  };
}
