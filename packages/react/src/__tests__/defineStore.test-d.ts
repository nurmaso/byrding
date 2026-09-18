/**
 * Type-level tests for the React defineStore overloads.
 *
 * Compile-time assertions only.  Run by vitest's typecheck (see
 * vitest.config.ts → tsconfig.test.json); the package build excludes
 * __tests__, so `tsc --noEmit -p tsconfig.json` does NOT cover this file.
 *
 * Acceptance criteria (issue #45):
 * - Class overload returns () => MergedStore<StateOf<InstanceType<C>>, ActionsOf<InstanceType<C>>>
 * - Closure overload returns () => MergedStore<StateOf<T>, ActionsOf<T>>
 * - No @ts-ignore suppressions in source or tests
 */

import { defineStore } from '../defineStore.js'
import type { MergedStore } from '@byrding/core'

// ─── Type helpers ─────────────────────────────────────────────────────────────

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/** Fails to compile (A extends true breaks) when the assertion is false. */
export type Assert<A extends true> = A

// ─── Closure overload ─────────────────────────────────────────────────────────

export const useClosureStore = defineStore('td-react-closure', () => ({
  count: 0,
  label: 'hello',
  increment() {},
}))

export type ClosureHookReturn = ReturnType<typeof useClosureStore>

export type _ClosureCount  = Assert<Equals<ClosureHookReturn['count'],  number>>
export type _ClosureLabel  = Assert<Equals<ClosureHookReturn['label'],  string>>
export type _ClosureAction = Assert<ClosureHookReturn extends { increment(): void } ? true : false>

export type _ClosureIsMergedStore = Assert<
  ClosureHookReturn extends MergedStore<{ count: number; label: string }, { increment(): void }>
    ? true
    : false
>

// ─── Class overload ───────────────────────────────────────────────────────────

class CounterStore {
  count = 0
  increment() { this.count++ }
}

export const useClassStore = defineStore('td-react-class', CounterStore)

export type ClassHookReturn = ReturnType<typeof useClassStore>

export type _ClassCount  = Assert<Equals<ClassHookReturn['count'], number>>
export type _ClassAction = Assert<ClassHookReturn extends { increment(): void } ? true : false>

export type _ClassIsMergedStore = Assert<
  ClassHookReturn extends MergedStore<{ count: number }, { increment(): void }>
    ? true
    : false
>

// ─── keyPaths typing ──────────────────────────────────────────────────────────
//
// `useStore(keyPaths)` is typed against the store's state and computed keys:
// `'*'`, a key, or `key.<anything>` for nested / array paths.  A typo used to
// silently subscribe to nothing; now it is a compile error.

export const useTypedStore = defineStore('td-react-paths', () => {
  const store = {
    count: 0,
    user: { address: { city: 'Oslo' } },
    items: [] as string[],
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})

export const _pathsWildcard = () => useTypedStore(['*'])
export const _pathsStateKeys = () => useTypedStore(['count', 'user'])
export const _pathsComputedKey = () => useTypedStore(['double'])
export const _pathsNested = () => useTypedStore(['user.address.city'])
export const _pathsArrayIndex = () => useTypedStore(['items.0', 'items.length'])
export const _pathsDefault = () => useTypedStore()

// @ts-expect-error — a typo is not a key path
export const _pathsTypo = () => useTypedStore(['cuont'])
// @ts-expect-error — actions are not subscribable
export const _pathsAction = () => useTypedStore(['increment'])
// @ts-expect-error — a nested path must start with a real key
export const _pathsBadRoot = () => useTypedStore(['users.address.city'])
// @ts-expect-error — an untyped string[] no longer type-checks (breaking change)
export const _pathsUntyped = (paths: string[]) => useTypedStore(paths)

class TypedClassStore {
  count = 0
  user = { name: 'x' }
  get double() { return this.count * 2 }
  increment() { this.count++ }
}

export const useTypedClassStore = defineStore('td-react-paths-class', TypedClassStore)

export const _classPathsOk = () => useTypedClassStore(['*', 'count', 'double', 'user.name'])
// @ts-expect-error — class actions are not subscribable either
export const _classPathsAction = () => useTypedClassStore(['increment'])
// @ts-expect-error — typo
export const _classPathsTypo = () => useTypedClassStore(['cont'])
