/**
 * @bocal/react — defineStore
 *
 * Returns a React hook that exposes the store as a **flat** reactive object.
 * No `state`, `actions`, or `getters` namespacing — everything is top-level:
 *
 * ```tsx
 * // Class style
 * class CounterStore {
 *   count = 0;
 *   get double() { return this.count * 2; }
 *   increment() { this.count++; }
 * }
 *
 * const useCounter = defineStore('counter', CounterStore);
 *
 * function Counter() {
 *   const store = useCounter();
 *   return <button onClick={store.increment}>{store.count}</button>;
 * }
 * ```
 *
 * ```tsx
 * // Closure factory style
 * const useCounter = defineStore('counter', () => {
 *   const counter = {
 *     count: 0,
 *     get double() { return counter.count * 2; },
 *     increment() { counter.count++; },
 *   };
 *   return counter;
 * });
 * ```
 *
 * ## Cross-framework sharing
 *
 * Export the id + definition from a shared file and import it into each
 * framework's `defineStore`:
 *
 * ```ts
 * // shared/counterStore.ts
 * export const COUNTER_ID = 'counter';
 * export class CounterStore { ... }
 *
 * // react-app/useCounter.ts
 * import { defineStore } from '@bocal/react';
 * import { COUNTER_ID, CounterStore } from '../shared/counterStore';
 * export const useCounter = defineStore(COUNTER_ID, CounterStore);
 *
 * // vue-app/useCounter.ts
 * import { defineStore } from '@bocal/vue';
 * import { COUNTER_ID, CounterStore } from '../shared/counterStore';
 * export const useCounter = defineStore(COUNTER_ID, CounterStore);
 * ```
 *
 * Because `@bocal/core` holds a module-level singleton registry, both adapters
 * share the exact same store instance.
 */

import { useSyncExternalStore } from 'react';
import { getOrCreateStore } from '@bocal/core';
import type { StoreDef } from '@bocal/core';

/**
 * Define a store and get back a React hook.
 *
 * @param id         Unique store identifier.  Reusing the same id across
 *                   multiple `defineStore` calls returns the same underlying
 *                   store (the definition is only evaluated once).
 * @param definition A class constructor *or* a factory function.
 * @returns          A hook `() => T` that can be called inside any React
 *                   component to get the flat, reactive store object.
 */
export function defineStore<T extends object>(
  id: string,
  definition: StoreDef<T>
): () => T {
  return function useStore(): T {
    const entry = getOrCreateStore<T>(id, definition);

    // useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
    //
    // We use the monotonic version number as the snapshot.  Every mutation
    // increments the version so React always sees a new scalar value and
    // schedules a re-render.  The component then reads the latest value
    // directly from `entry.store` (the reactive proxy).
    useSyncExternalStore(entry.subscribe, entry.getVersion, entry.getVersion);

    return entry.store;
  };
}
