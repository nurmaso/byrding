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
 * ## Devtools integration
 *
 * In development, the composable reads the component name from Vue's
 * `getCurrentInstance()` — no configuration needed.  Render counts and
 * component lifecycle events are emitted to `window.__BYRDING_DEVTOOLS__`
 * automatically.
 */

import { shallowReactive, onUnmounted, getCurrentInstance } from 'vue'
import { createStore, generateComponentId, getDevtoolsHook } from '@byrding/core'

// ─── defineStore ─────────────────────────────────────────────────────────────

export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
) {
  const coreStore = createStore<T>(id, definition)

  return function useStore(keyPaths: string[] = ['*']): T {
    const componentId = generateComponentId()
    const hook = getDevtoolsHook()

    // Vue exposes the component name reliably via getCurrentInstance.
    const instance = getCurrentInstance()
    const componentName =
      instance?.type?.__name ??
      (instance?.type as { name?: string })?.name ??
      componentId

    let renderCount = 0

    const reactiveStore = shallowReactive({ ...coreStore.store }) as T

    const syncStore = () => {
      renderCount++
      hook?.emit({
        type: 'component:rendered',
        componentId,
        name: componentName,
        storeId: id,
        renderCount,
        timestamp: Date.now(),
      })
      Object.assign(reactiveStore as Record<string, unknown>, coreStore.store)
    }

    const unsubscribe = coreStore.subscribe(componentId, keyPaths, syncStore)

    hook?.emit({
      type: 'component:mounted',
      componentId,
      name: componentName,
      framework: 'vue',
      storeId: id,
      keyPaths,
      timestamp: Date.now(),
    })

    if (instance) {
      onUnmounted(() => {
        unsubscribe()
        hook?.emit({
          type: 'component:unmounted',
          componentId,
          storeId: id,
          timestamp: Date.now(),
        })
      })
    }

    return reactiveStore
  }
}
