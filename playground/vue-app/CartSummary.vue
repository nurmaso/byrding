<template>
  <p style="font-family: monospace">
    Cart summary: {{ totalItems }} item(s) — ${{ total.toFixed(2) }}
  </p>
</template>

<script setup lang="ts">
import { useCartStore } from './useCartStore.js'

/**
 * Destructuring style — mirrors BComponent.tsx in the React app.
 * Because `useCartStore()` returns a shallowReactive object, destructured
 * variables retain Vue reactivity through the reactive proxy.
 */
const { totalItems, total } = useCartStore()
</script>
