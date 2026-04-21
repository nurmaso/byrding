/**
 * shared/cart.store.ts
 *
 * Shared store definition — imported by both `react-app` and `vue-app`.
 * Exporting both the ID and the definition (class or factory) from a single
 * file is the requirement for cross-framework sharing.
 *
 * The core registry ensures the store is only initialised once, regardless of
 * how many times `defineStore` is called with `cartId`.  Mutating the cart
 * from a React component will immediately re-render Vue components subscribed
 * to the same keys, and vice versa.
 */

// ─── Shared identifier ────────────────────────────────────────────────────────

export const cartId = 'cart'

// ─── Style A: exported class ─────────────────────────────────────────────────

export class CartStore {
  items: Array<{ id: string; qty: number }> = []
  taxRate = 0.19

  get totalItems(): number {
    return this.items.reduce((sum, i) => sum + i.qty, 0)
  }

  get subtotal(): number {
    return this.items.length * 10
  }

  get total(): number {
    return this.subtotal * (1 + this.taxRate)
  }

  addItem(id: string): void {
    const existing = this.items.find((i) => i.id === id)
    if (existing) {
      existing.qty++
    } else {
      this.items.push({ id, qty: 1 })
    }
  }

  removeItem(id: string): void {
    this.items = this.items.filter((i) => i.id !== id)
  }

  clear(): void {
    this.items = []
  }
}

// ─── Style B: exported factory function ──────────────────────────────────────

export const cartDefinition = () => {
  const store = {
    items: [] as Array<{ id: string; qty: number }>,
    taxRate: 0.19,

    get totalItems(): number {
      return store.items.reduce((sum, i) => sum + i.qty, 0)
    },

    get subtotal(): number {
      return store.items.length * 10
    },

    get total(): number {
      return store.subtotal * (1 + store.taxRate)
    },

    addItem(id: string): void {
      const existing = store.items.find((i) => i.id === id)
      if (existing) {
        existing.qty++
      } else {
        store.items.push({ id, qty: 1 })
      }
    },

    removeItem(id: string): void {
      store.items = store.items.filter((i) => i.id !== id)
    },

    clear(): void {
      store.items = []
    },
  }
  return store
}
