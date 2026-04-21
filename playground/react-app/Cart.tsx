/**
 * react-app/Cart.tsx
 *
 * React smoke-test component.  Uses the flat store API directly — no
 * `state.items`, `actions.addItem`, or `getters.total` namespacing.
 *
 * Selective subscription example:
 *   useCartStore(['items', 'taxRate'])
 * Only re-renders when `items` or `taxRate` change, not on every store update.
 */
import React from 'react'
import { useCartStore } from './useCartStore.js'

export function Cart() {
  // Wildcard subscription — re-renders on any change.
  const store = useCartStore()

  return (
    <div style={{ fontFamily: 'monospace', padding: '1rem', border: '1px solid #ccc' }}>
      <h2>@bocal/react — Cart (class style)</h2>

      <p>Items in cart: {store.totalItems}</p>
      <p>Subtotal: ${store.subtotal.toFixed(2)}</p>
      <p>Tax rate: {(store.taxRate * 100).toFixed(0)}%</p>
      <p>Total: ${store.total.toFixed(2)}</p>

      <hr />

      <button onClick={() => store.addItem('apple')}>Add apple</button>{' '}
      <button onClick={() => store.addItem('banana')}>Add banana</button>{' '}
      <button onClick={() => store.removeItem('apple')}>Remove apple</button>{' '}
      <button onClick={store.clear}>Clear</button>

      <ul>
        {store.items.map((item) => (
          <li key={item.id}>
            {item.id} × {item.qty}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── BComponent — destructuring style ────────────────────────────────────────

export function CartSummary() {
  const { totalItems, total } = useCartStore()

  return (
    <p style={{ fontFamily: 'monospace' }}>
      Cart summary: {totalItems} item(s) — ${total.toFixed(2)}
    </p>
  )
}
