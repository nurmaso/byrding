/**
 * Type-level tests for `KeyPath<T>` and the typed `StoreHandle.subscribe`.
 * Run by vitest's typecheck (see vitest.config.ts) — no runtime.
 */

import { createStore } from '../createStore.js'
import type { KeyPath } from '../types.js'

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Assert<A extends true> = A

// ─── KeyPath<T> shape ─────────────────────────────────────────────────────────

type Shape = { count: number; user: { name: string }; get double(): number; increment(): void }

// State and computed keys, the wildcard, and any dotted tail under a real key.
// Functions (actions) are excluded.
export type _KeyPathShape = Assert<
  Equals<
    KeyPath<Shape>,
    '*' | 'count' | 'user' | 'double' | `count.${string}` | `user.${string}` | `double.${string}`
  >
>

// ─── StoreHandle.subscribe ────────────────────────────────────────────────────

export const handle = createStore('td-core-paths', () => {
  const store = {
    count: 0,
    user: { address: { city: 'Oslo' } },
    items: [] as number[],
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})

export const _subscribeOk = () =>
  handle.subscribe('c', ['*', 'count', 'double', 'user.address.city', 'items.0', 'items.length'], () => {})

// @ts-expect-error — typo
export const _subscribeTypo = () => handle.subscribe('c', ['cuont'], () => {})
// @ts-expect-error — actions are not subscribable
export const _subscribeAction = () => handle.subscribe('c', ['increment'], () => {})
// @ts-expect-error — an untyped string[] no longer type-checks
export const _subscribeUntyped = (paths: string[]) => handle.subscribe('c', paths, () => {})

class ClassShape {
  count = 0
  get double() { return this.count * 2 }
  increment() { this.count++ }
}

export const classHandle = createStore('td-core-paths-class', ClassShape)

export const _classSubscribeOk = () => classHandle.subscribe('c', ['*', 'count', 'double'], () => {})
// @ts-expect-error — class action
export const _classSubscribeAction = () => classHandle.subscribe('c', ['increment'], () => {})
