/**
 * main.ts — unified entry point
 *
 * Mounts the React app and the Vue app into separate DOM nodes on the same
 * page.  Because both call `defineStore(cartId, CartStore)` and `@byrding/core`
 * is a singleton module, the store is initialised exactly once.  Any mutation
 * from the React side (or Vue side) notifies all subscribers regardless of
 * which framework they belong to.
 */

// ── React ────────────────────────────────────────────────────────────────────

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Cart, CartSummary } from './react-app/Cart.tsx'
import { ToggleComponent } from './react-app/Toggle.tsx'

const reactMount = document.getElementById('react-root')!
createRoot(reactMount).render(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(Cart),
    React.createElement(CartSummary),
    React.createElement(ToggleComponent),
  ),
)

// ── Vue ──────────────────────────────────────────────────────────────────────

import { createApp } from 'vue'
import VueCart from './vue-app/Cart.vue'
import VueCartSummary from './vue-app/CartSummary.vue'
import { defineComponent, h } from 'vue'

const VueApp = defineComponent({
  render() {
    return [h(VueCart), h(VueCartSummary)]
  },
})

createApp(VueApp).mount(document.getElementById('vue-root')!)
