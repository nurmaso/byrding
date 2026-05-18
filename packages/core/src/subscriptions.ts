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

// ─── Cross-store dep graph ────────────────────────────────────────────────────

/**
 * Thrown when a circular reactive dependency between stores is detected during
 * cross-store notification propagation.
 *
 * `cycle` lists the store IDs in the order they appear in the dependency chain,
 * with the repeated ID appended at the end (e.g. `['a', 'b', 'a']`).
 */
export class ByrdingCycleError extends Error {
  readonly cycle: string[]
  constructor(cycle: string[]) {
    super(`[byrding] Cycle: ${cycle.join(' → ')}`)
    this.name = 'ByrdingCycleError'
    this.cycle = cycle
  }
}

/**
 * Module-level dep-edge map.  Key = watched store ID, value = Set of store IDs
 * that depend on it.  When store B changes, all IDs in `storeDepEdges.get('b')`
 * must also be notified.
 *
 * Edges are registered lazily in `makeUseStoreFn`'s proxy get trap whenever a
 * computed getter evaluates and reads a cross-store proxy property.
 */
export const storeDepEdges = new Map<string, Set<string>>()

/** Register that `fromId` depends on `toId` (changes to `toId` propagate to `fromId`). */
export function registerCrossStoreDep(fromId: string, toId: string): void {
  if (!storeDepEdges.has(toId)) storeDepEdges.set(toId, new Set())
  storeDepEdges.get(toId)!.add(fromId)
}

/**
 * Remove all dep edges associated with `storeId`.
 * Call when a store is unregistered to prevent stale notifications.
 */
export function removeStoreDeps(storeId: string): void {
  // Remove as an upstream source
  storeDepEdges.delete(storeId)
  // Remove as a dependent from all upstream stores
  for (const deps of storeDepEdges.values()) {
    deps.delete(storeId)
  }
}

/** @testonly Clear all cross-store dep edges. Call alongside `resetRegistry`. */
export function resetDepEdges(): void {
  storeDepEdges.clear()
}

// ─── Getter evaluation tracking ───────────────────────────────────────────────

/**
 * Stack of store IDs currently being evaluated as computed getters.
 * Pushed before a getter fires, popped after. Used by `makeUseStoreFn`'s
 * proxy get trap to register reactive dep edges without tracking action calls.
 */
const _evaluatingStack: string[] = []

export function pushEvaluatingStore(id: string): void {
  _evaluatingStack.push(id)
}

export function popEvaluatingStore(): void {
  _evaluatingStack.pop()
}

/** Returns the store ID of the innermost getter currently evaluating, or undefined. */
export function peekEvaluatingStore(): string | undefined {
  return _evaluatingStack[_evaluatingStack.length - 1]
}

// ─── Cross-store propagation ──────────────────────────────────────────────────

/**
 * Propagate a state change from `changedStoreId` to all stores that declared
 * a reactive dependency on it (via getter reads through `useStore()`).
 *
 * Uses a DFS in-stack set to detect cycles without false-positives on diamond
 * dependencies (e.g. A→B→D and A→C→D: D notifies B and C independently without
 * triggering a cycle error).
 */
export function notifyCrossStoreDeps(
  changedStoreId: string,
  getStore: (id: string) => StoreInstance<any, any> | undefined,
): void {
  _propagate(changedStoreId, getStore, new Set([changedStoreId]))
}

function _propagate(
  changedStoreId: string,
  getStore: (id: string) => StoreInstance<any, any> | undefined,
  inStack: Set<string>,
): void {
  const dependents = storeDepEdges.get(changedStoreId)
  if (!dependents || dependents.size === 0) return

  for (const depId of dependents) {
    if (inStack.has(depId)) {
      throw new ByrdingCycleError([...inStack, depId])
    }
    inStack.add(depId)
    const depStore = getStore(depId)
    if (depStore) notify(depStore, '*')
    _propagate(depId, getStore, inStack)
    inStack.delete(depId)
  }
}

// ─── Component subscriptions ──────────────────────────────────────────────────

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
 *
 * When `rawKeyPath === '*'` (cross-store propagation sentinel), every callback
 * in `_callbackMap` is fired directly — bypassing the key-path filter — so
 * that components subscribed to any key of a dependent store are re-rendered.
 */
export function notify(store: StoreInstance<any, any>, rawKeyPath: string): void {
  if (rawKeyPath === '*') {
    for (const cb of store._callbackMap.values()) cb()
    return
  }

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
