/**
 * @bocal/react — defineStore
 *
 * Returns a React hook from a store definition.  The hook is what developers
 * export from their store files and call inside components.
 *
 * ```ts
 * // stores/counter.ts
 * import { defineStore } from '@bocal/react'
 *
 * export const useCounterStore = defineStore('counter', () => {
 *   const store = {
 *     count: 0,
 *     get double() { return store.count * 2 },
 *     increment() { store.count++ },
 *   }
 *   return store
 * })
 * ```
 *
 * ```tsx
 * // AComponent.tsx — direct access
 * const store = useCounterStore()
 * store.count       // state
 * store.double      // computed
 * store.increment() // action
 *
 * // BComponent.tsx — destructuring
 * const { count, double, increment } = useCounterStore()
 *
 * // Selective subscription — only re-renders when `count` changes
 * const store = useCounterStore(['count'])
 * ```
 *
 * ## Cross-framework sharing
 *
 * Export the ID and definition from a shared file and import into each
 * framework's `defineStore`.  The core registry ensures the store is only
 * initialised once.
 *
 * ## Implementation notes
 *
 * `useSyncExternalStore` requires a **stable** `subscribe` reference — a new
 * function on every render causes an infinite loop.  We stabilise it via
 * `useRef`.  The `componentId` is also kept stable across re-renders.
 *
 * `getSnapshot` returns a cached shallow copy of raw state; the cache is
 * invalidated on each mutation so React sees a new reference and schedules a
 * re-render.  The component then reads actual values from `coreStore.store`
 * (the live merged object with getters) after the re-render.
 */

import { useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { createStore, generateComponentId } from '@bocal/core'

export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
) {
  // Register with core once at module load time.
  // createStore is idempotent for the same id — safe to call multiple times.
  const coreStore = createStore<T>(id, definition)

  /** The hook returned to the developer. */
  return function useStore(keyPaths: string[] = ['*']): T {
    // Stable component ID — generated only on the first render.
    const componentIdRef = useRef<string | null>(null)
    if (!componentIdRef.current) {
      componentIdRef.current = generateComponentId()
    }
    const componentId = componentIdRef.current

    // subscribe must be referentially stable across renders.
    // A new function identity on every render causes useSyncExternalStore to
    // re-subscribe on every render → infinite loop.
    const subscribeRef = useRef((onStoreChange: () => void) => {
      return coreStore.subscribe(componentId, keyPaths, onStoreChange)
    })

    // useSyncExternalStore drives re-renders.
    //   - subscribe:    called once to register; returns unsubscribe fn.
    //   - getSnapshot:  returns a cached object; changes reference on mutation.
    // The snapshot is raw state only.  Computed values are re-evaluated from
    // the merged store's getters after each re-render.
    useSyncExternalStore(
      subscribeRef.current,
      coreStore.getSnapshot,
      coreStore.getSnapshot,
    )

    // Return the live flat merged store object — reads go through getters
    // which always return the current value.
    return coreStore.store
  }
}
