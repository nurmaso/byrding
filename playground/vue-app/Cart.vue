<template>
  <div style="font-family: monospace; padding: 1rem; border: 1px solid #ccc">
    <h2>@bocal/vue — Cart (class style)</h2>

    <p>Items in cart: {{ store.totalItems }}</p>
    <p>Subtotal: ${{ store.subtotal.toFixed(2) }}</p>
    <p>Tax rate: {{ (store.taxRate * 100).toFixed(0) }}%</p>
    <p>Total: ${{ store.total.toFixed(2) }}</p>

    <hr />

    <button @click="store.addItem('apple')">Add apple</button>
    <button @click="store.addItem('banana')">Add banana</button>
    <button @click="store.removeItem('apple')">Remove apple</button>
    <button @click="store.clear">Clear</button>

    <ul>
      <li v-for="item in store.items" :key="item.id">
        {{ item.id }} × {{ item.qty }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from './useCartStore.js'

/**
 * `useCartStore()` returns a Vue `shallowReactive` object.
 * Template reads (`store.totalItems`, `store.items`, …) are tracked by Vue's
 * reactive system.  When the Bocal core notifies any change — whether from
 * this Vue component or from a React component using the same store id —
 * `syncStore()` in the adapter reassigns the shallowReactive properties and
 * Vue queues a re-render.
 */
const store = useCartStore()
</script>
