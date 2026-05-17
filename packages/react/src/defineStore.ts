/**
 * @byrding/react — defineStore
 *
 * Returns a React hook from a store definition.  The hook is what developers
 * export from their store files and call inside components.
 *
 * ```ts
 * // stores/counter.ts
 * import { defineStore } from '@byrding/react'
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
 * In development, the hook automatically infers the calling component's name
 * from the call stack (PascalCase function name or file name).  Render counts
 * and component lifecycle events are emitted to `window.__BYRDING_DEVTOOLS__`
 * with zero configuration required from the developer.
 */

import { useRef } from 'react'
import { useSyncExternalStore } from 'react'
import {
  createStore,
  generateComponentId,
  getDevtoolsHook,
  type CoreStore,
  type MergedStore,
  type StateOf,
  type ActionsOf,
} from '@byrding/core'

// ─── Component name inference ─────────────────────────────────────────────────

/**
 * Parses the call stack captured at `useStore` call time to find the first
 * PascalCase function name or PascalCase file name — that's the React component.
 * Only runs in development; returns `undefined` in production.
 */
function inferComponentName(): string | undefined {
  try {
    const lines = new Error().stack?.split('\n') ?? []
    // lines[0] = 'Error'
    // lines[1] = inferComponentName
    // lines[2] = useStore (our hook body)
    // lines[3+] = React internals or the calling component
    for (let i = 3; i < Math.min(lines.length, 12); i++) {
      const line = lines[i]
      const nameMatch = line.match(/at (\w+)[\s(]/)
      if (nameMatch?.[1] && /^[A-Z]/.test(nameMatch[1])) return nameMatch[1]
      const fileMatch = line.match(/\/([A-Z][^/]*?)\.[jt]sx?[):,]/)
      if (fileMatch?.[1]) return fileMatch[1]
    }
  } catch {
    // stack parsing is best-effort
  }
  return undefined
}

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
    const componentIdRef = useRef<string | null>(null)
    if (!componentIdRef.current) {
      componentIdRef.current = generateComponentId()
    }
    const componentId = componentIdRef.current

    // Infer component name once on first render.
    const componentNameRef = useRef<string | undefined>(undefined)
    if (!componentNameRef.current) {
      componentNameRef.current = inferComponentName() ?? componentId
    }
    const componentName = componentNameRef.current

    const renderCountRef = useRef(0)
    const mountedRef = useRef(false)

    // subscribe must be referentially stable across renders.
    const subscribeRef = useRef((onStoreChange: () => void) => {
      const hook = getDevtoolsHook()

      // Emit component:mounted on first subscription.
      if (!mountedRef.current) {
        mountedRef.current = true
        hook?.emit({
          type: 'component:mounted',
          componentId,
          name: componentName,
          framework: 'react',
          storeId: id,
          keyPaths,
          timestamp: Date.now(),
        })
      }

      const trackedCallback = () => {
        renderCountRef.current++
        hook?.emit({
          type: 'component:rendered',
          componentId,
          name: componentName,
          storeId: id,
          renderCount: renderCountRef.current,
          timestamp: Date.now(),
        })
        onStoreChange()
      }

      const unsubscribe = storeHandle.subscribe(componentId, keyPaths, trackedCallback)

      return () => {
        unsubscribe()
        getDevtoolsHook()?.emit({
          type: 'component:unmounted',
          componentId,
          storeId: id,
          timestamp: Date.now(),
        })
      }
    })

    useSyncExternalStore(
      subscribeRef.current,
      storeHandle.getSnapshot,
      storeHandle.getSnapshot,
    )

    return storeHandle.store as MergedStore<StateOf<T>, ActionsOf<T>>
  }
}

// ─── Vite HMR ────────────────────────────────────────────────────────────────

if (import.meta.hot) {
  // Self-accept so Fast Refresh doesn't bubble up to the app root.
  // State preservation is handled by the core registry hot.data fix (#40).
  // useSyncExternalStore re-subscribes automatically on next render because
  // createStore returns the same preserved instance for the same id.
  import.meta.hot.accept()
}
