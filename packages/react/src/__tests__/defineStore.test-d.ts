/**
 * Type-level tests for the React defineStore overloads.
 *
 * These are compile-time assertions only — no test runner required.
 * `tsc --noEmit` (or the package build) will fail if any assertion breaks.
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
