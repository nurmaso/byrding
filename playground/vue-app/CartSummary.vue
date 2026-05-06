<template>
  <p style="font-family: monospace">
    Cart summary: {{ totalItems }} item(s) — ${{ total.toFixed(2) }}
  </p>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import { useCartStore } from './useCartStore.js'

const { totalItems, total } = toRefs(useCartStore())
</script>
