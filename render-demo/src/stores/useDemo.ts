import { defineStore } from '@bocal/react'

/**
 * Demo store with three independent state slices.
 *
 * Each slice can be mutated in isolation so the playground can demonstrate
 * that a component subscribed only to `count` does NOT re-render when
 * `name` or `description` changes, and vice versa.
 */
export class DemoStore {
  count = 0
  name = 'World'
  description = 'Try the buttons above ↑'

  increment(): void {
    this.count++
  }

  decrement(): void {
    this.count--
  }

  cycleName(): void {
    const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank']
    const idx = names.indexOf(this.name)
    this.name = idx === -1 ? names[0] : names[(idx + 1) % names.length]
  }

  updateDescription(): void {
    this.description = `Updated at ${new Date().toLocaleTimeString()}`
  }
}

/**
 * `useDemo` is the React hook.  Components pass the key paths they care
 * about so only relevant state changes trigger a re-render.
 *
 * Examples:
 *   useDemo()              // subscribe to everything (default: ['*'])
 *   useDemo(['count'])     // re-render only when count changes
 *   useDemo(['name'])      // re-render only when name changes
 */
export const useDemo = defineStore('demo', DemoStore)
