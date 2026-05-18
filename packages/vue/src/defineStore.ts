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
import {
  createStore,
  generateComponentId,
  getDevtoolsHook,
  type CoreStore,
  type MergedStore,
  type StateOf,
  type ActionsOf,
} from '@byrding/core'

// ─── defineStore ─────────────────────────────────────────────────────────────

export function defineStore<C extends new () => object>(
  id: string,
  definition: C,
  options?: { core?: CoreStore },
): (keyPaths?: string[]) => MergedStore<StateOf<InstanceType<C>>, ActionsOf<InstanceType<C>>>
export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: () => T,
  options?: { core?: CoreStore },
): (keyPaths?: string[]) => MergedStore<StateOf<T>, ActionsOf<T>>
export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
  options?: { core?: CoreStore },
): (keyPaths?: string[]) => MergedStore<StateOf<T>, ActionsOf<T>> {
  const storeHandle = createStore<T>(id, definition, options)

  return function useStore(keyPaths: string[] = ['*']): MergedStore<StateOf<T>, ActionsOf<T>> {
    const componentId = generateComponentId()
    const hook = getDevtoolsHook()

    // Vue exposes the component name reliably via getCurrentInstance.
    const instance = getCurrentInstance()
    const componentName =
      instance?.type?.__name ??
      (instance?.type as { name?: string })?.name ??
      componentId

    let renderCount = 0

    const reactiveStore = shallowReactive({ ...storeHandle.store }) as unknown as MergedStore<StateOf<T>, ActionsOf<T>>

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
      Object.assign(reactiveStore as Record<string, unknown>, storeHandle.store)
    }

    const unsubscribe = storeHandle.subscribe(componentId, keyPaths, syncStore)

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

    return reactiveStore as MergedStore<StateOf<T>, ActionsOf<T>>
  }
}

// ─── Vite HMR ────────────────────────────────────────────────────────────────

type _ViteHot = { accept(cb?: (mod: unknown) => void): void }
const _hot = (import.meta as { hot?: _ViteHot }).hot
if (_hot) {
  // Self-accept so Vite doesn't propagate the reload to the app root.
  // The shallowReactive in useStore() re-syncs on the next composable call
  // because createStore returns the preserved instance from hot.data.
  _hot.accept()
}
