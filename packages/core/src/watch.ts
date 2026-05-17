/**
 * watch.ts
 *
 * watchState — a vanilla-JS utility for observing individual state keys on a
 * StoreHandle.  The returned watcher exposes a getter that reads the live
 * value, a setter that writes through the reactive surface (triggering the
 * store's notify → subscriber callbacks), and an `unwatch` function that
 * removes the listener.
 */

import { generateComponentId } from './createStore.js'
import type { StoreHandle, StateOf } from './types.js'

export interface StateWatcher<V> {
  /** Read the current live value of the watched key. */
  get(): V
  /** Write a new value through the store's reactive surface. */
  set(value: V): void
  /** Remove this watcher; the callback will no longer fire. */
  unwatch(): void
}

/**
 * Watch a single state key on a `StoreHandle`.
 *
 * The `callback` receives `(newValue, oldValue)` each time the key changes.
 * Returns a `StateWatcher` with `get`, `set`, and `unwatch` methods.
 *
 * @example
 * const { get, set, unwatch } = watchState(handle, 'count', (next, prev) => {
 *   console.log(`count changed: ${prev} → ${next}`)
 * })
 * set(5)      // triggers callback and notifies all subscribers
 * get()       // 5
 * unwatch()   // stop listening
 */
export function watchState<
  T extends Record<string, unknown>,
  K extends keyof StateOf<T> & string,
>(
  handle: StoreHandle<T>,
  key: K,
  callback: (newValue: StateOf<T>[K], oldValue: StateOf<T>[K]) => void,
): StateWatcher<StateOf<T>[K]> {
  type V = StateOf<T>[K]
  const store = handle.store as Record<string, unknown>
  let lastValue = store[key] as V
  const componentId = generateComponentId()

  const unsubscribe = handle.subscribe(componentId, [key], () => {
    const newValue = store[key] as V
    callback(newValue, lastValue)
    lastValue = newValue
  })

  return {
    get: () => store[key] as V,
    set: (value: V) => {
      store[key] = value
    },
    unwatch: unsubscribe,
  }
}
