import { classify } from './classify.js'
import type { StateOf, ActionsOf } from './types.js'

function isClass(fn: Function): boolean {
  return /^\s*class\s/.test(fn.toString())
}

/**
 * A factory that returns a spy/mock function.
 * Pass `vi.fn` (vitest) or `jest.fn` (jest) — the factory is called once per
 * action to produce an independently trackable spy.
 */
export type SpyFactory = () => (...args: unknown[]) => unknown

/**
 * createMockStore — testing utility
 *
 * Instantiates a store definition, extracts initial state and action names,
 * and returns a plain object with:
 *   - state keys set to their initial values
 *   - action keys replaced with `spyFn()` calls
 *
 * Computed keys are intentionally omitted — they derive from state and have
 * no meaning in a mock context.
 *
 * Export path: `@byrding/core/testing` (tree-shakeable, never in main bundle)
 *
 * @example
 * import { createMockStore } from '@byrding/core/testing'
 * const mock = createMockStore(CounterStore, vi.fn)
 * // { count: 0, increment: vi.fn(), decrement: vi.fn() }
 */
export function createMockStore<C extends new () => object>(
  def: C,
  spyFn?: SpyFactory,
): StateOf<InstanceType<C>> & ActionsOf<InstanceType<C>>
export function createMockStore<T extends Record<string, unknown>>(
  def: () => T,
  spyFn?: SpyFactory,
): T
export function createMockStore(
  def: (new () => object) | (() => object),
  spyFn: SpyFactory = () => () => {},
): Record<string, unknown> {
  const instance: Record<string, unknown> = isClass(def)
    ? new (def as new () => object)() as Record<string, unknown>
    : (def as () => object)() as Record<string, unknown>

  const { stateKeys, actionKeys } = classify(instance)

  const state: Record<string, unknown> = {}
  for (const key of stateKeys) {
    state[key] = instance[key]
  }

  const actions: Record<string, unknown> = {}
  for (const key of actionKeys) {
    actions[key] = spyFn()
  }

  return { ...state, ...actions }
}
