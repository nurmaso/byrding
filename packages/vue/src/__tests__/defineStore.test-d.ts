/**
 * Type-level tests for the Vue defineStore overloads.
 *
 * These are compile-time assertions only — no test runner required.
 * `tsc --noEmit` (or the package build) will fail if any assertion breaks.
 *
 * Acceptance criteria (issue #46):
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

export const useClosureStore = defineStore('td-vue-closure', () => ({
  count: 0,
  label: 'hello',
  increment() {},
}))

export type ClosureComposableReturn = ReturnType<typeof useClosureStore>

export type _ClosureCount  = Assert<Equals<ClosureComposableReturn['count'],  number>>
export type _ClosureLabel  = Assert<Equals<ClosureComposableReturn['label'],  string>>
export type _ClosureAction = Assert<ClosureComposableReturn extends { increment(): void } ? true : false>

export type _ClosureIsMergedStore = Assert<
  ClosureComposableReturn extends MergedStore<{ count: number; label: string }, { increment(): void }>
    ? true
    : false
>

// ─── Class overload ───────────────────────────────────────────────────────────

class CounterStore {
  count = 0
  increment() { this.count++ }
}

export const useClassStore = defineStore('td-vue-class', CounterStore)

export type ClassComposableReturn = ReturnType<typeof useClassStore>

export type _ClassCount  = Assert<Equals<ClassComposableReturn['count'], number>>
export type _ClassAction = Assert<ClassComposableReturn extends { increment(): void } ? true : false>

export type _ClassIsMergedStore = Assert<
  ClassComposableReturn extends MergedStore<{ count: number }, { increment(): void }>
    ? true
    : false
>
