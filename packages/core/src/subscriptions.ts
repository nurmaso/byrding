/**
 * subscriptions.ts
 *
 * Component-aware subscribe / notify implementation.
 *
 * Each subscriber is identified by a unique `componentId` string (generated
 * by `generateComponentId` in `createStore.ts`).  Subscribers declare which
 * key paths they care about; passing `['*']` subscribes to every change.
 *
 * On notification, ancestor paths are also notified so that a component
 * subscribed to `"user"` is re-rendered when `"user.name"` changes.
 */

import type { StoreInstance } from './types.js'
import { normaliseKeyPath } from './proxy.js'

/**
 * Register `componentId` as a subscriber for `keyPaths` on `store`.
 * Returns an unsubscribe function that removes the subscriber cleanly.
 */
export function subscribe(
  store: StoreInstance<any, any>,
  componentId: string,
  keyPaths: string[],
  callback: () => void,
): () => void {
  store._callbackMap.set(componentId, callback)
  const isWildcard = keyPaths.includes('*')

  if (isWildcard) {
    if (!store._updateMap.has('*')) store._updateMap.set('*', new Set())
    store._updateMap.get('*')!.add(componentId)
  } else {
    for (const path of keyPaths) {
      if (!store._updateMap.has(path)) store._updateMap.set(path, new Set())
      store._updateMap.get(path)!.add(componentId)
    }
  }

  return () => {
    store._callbackMap.delete(componentId)
    if (isWildcard) {
      store._updateMap.get('*')?.delete(componentId)
    } else {
      for (const path of keyPaths) {
        store._updateMap.get(path)?.delete(componentId)
      }
    }
  }
}

/**
 * Notify all subscribers that are interested in `rawKeyPath`.
 *
 * Propagation:
 *   1. Exact match  (`"user.address.city"`)
 *   2. All ancestors (`"user.address"`, then `"user"`)
 *   3. Wildcard (`"*"`)
 *
 * Array-specific paths are normalised first (e.g. `"items.0"` → `"items"`).
 */
export function notify(store: StoreInstance<any, any>, rawKeyPath: string): void {
  const keyPath = normaliseKeyPath(rawKeyPath)
  const toNotify = new Set<string>()

  // Collect from exact match and all ancestors.
  const parts = keyPath.split('.')
  for (let i = parts.length; i > 0; i--) {
    const path = parts.slice(0, i).join('.')
    store._updateMap.get(path)?.forEach((id) => toNotify.add(id))
  }

  // Wildcard catches everything.
  store._updateMap.get('*')?.forEach((id) => toNotify.add(id))

  for (const componentId of toNotify) {
    store._callbackMap.get(componentId)?.()
  }
}
