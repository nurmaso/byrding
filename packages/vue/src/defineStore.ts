/**
 * @byrding/vue — defineStore
 *
 * Returns a Vue 3 composable from a store definition.
 *
 * ```ts
 * // stores/counter.ts
 * import { defineStore } from '@byrding/vue'
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
 * ```vue
 * <!-- AComponent.vue -->
 * <script setup lang="ts">
 * import { useCounterStore } from '@/stores/counter'
 * const store = useCounterStore()
 * </script>
 * <template>
 *   <p>{{ store.count }}</p>
 *   <p>{{ store.double }}</p>
 *   <button @click="store.increment()">+</button>
 * </template>
 * ```
 *
 * ## Reactivity model
 *
 * The composable returns a Vue `shallowReactive` object.  Vue's template
 * system tracks reads of its top-level properties.  When the Bocal core
 * notifies a change (including from a React component mutating the same
 * shared store), we call `Object.assign(reactiveStore, coreStore.store)`
 * which copies the latest state + computed values into the reactive object.
 * Vue detects the changed properties and re-renders subscribed components.
 *
 * Action references stay stable (same function reference on every sync),
 * so Vue does not needlessly trigger re-renders for action-key reads.
 *
 * ## Lifecycle
 *
 * When called inside a component `setup()`, `onUnmounted` tears down the
 * Bocal subscription.  When called outside a component context (e.g. in a
 * Pinia-style store module), the `getCurrentInstance()` guard prevents the
 * lifecycle call from throwing.
 */

import { shallowReactive, onUnmounted, getCurrentInstance } from 'vue'
import { createStore, generateComponentId } from '@byrding/core'

export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
) {
  // Idempotent — same id always returns the same singleton.
  const coreStore = createStore<T>(id, definition)

  /** The composable returned to the developer. */
  return function useStore(keyPaths: string[] = ['*']): T {
    const componentId = generateComponentId()

    // Build the initial snapshot by spreading the merged store.
    // Object.assign / spread invokes each getter on coreStore.store, so the
    // resulting plain object holds current state values, current computed
    // values, and action function references.
    const reactiveStore = shallowReactive({ ...coreStore.store }) as T

    // Sync function — called on every Bocal notification.
    // Object.assign re-reads all getters from coreStore.store (current values)
    // and assigns them to the shallowReactive wrapper.
    // Vue detects changed properties and queues a re-render for any component
    // template that read those properties — including cross-framework
    // mutations originating from React components.
    const syncStore = () => {
      Object.assign(reactiveStore as Record<string, unknown>, coreStore.store)
    }

    const unsubscribe = coreStore.subscribe(componentId, keyPaths, syncStore)

    if (getCurrentInstance()) {
      onUnmounted(unsubscribe)
    }

    return reactiveStore
  }
}
