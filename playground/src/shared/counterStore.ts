/**
 * Shared store definition — imported by both the React and Vue playgrounds.
 *
 * Demonstrates two authoring styles:
 *   1. Class   — export `CounterStore` (class)
 *   2. Factory — export `counterFactory` (closure function)
 *
 * Both produce an identical flat API:  { count, double, increment, reset }
 */

// ─── 1. Class style ──────────────────────────────────────────────────────────

export const COUNTER_ID = 'shared-counter';

export class CounterStore {
  count = 0;

  /** Computed getter — re-evaluated through the reactive proxy. */
  get double(): number {
    return this.count * 2;
  }

  increment(): void {
    this.count++;
  }

  reset(): void {
    this.count = 0;
  }
}

// ─── 2. Closure factory style ─────────────────────────────────────────────────

export const COUNTER_FACTORY_ID = 'shared-counter-factory';

/**
 * Self-reference is achieved by naming the returned object (`counter`) and
 * referring to it inside the methods — no `this` binding required.
 */
export function counterFactory() {
  const counter = {
    count: 0,

    get double(): number {
      return counter.count * 2;
    },

    increment(): void {
      counter.count++;
    },

    reset(): void {
      counter.count = 0;
    },
  };

  return counter;
}
