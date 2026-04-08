<template>
  <div style="font-family: monospace; padding: 1rem">
    <h2>@bocal/vue — Counter (class style)</h2>
    <p>count: {{ store.count }}</p>
    <p>double: {{ store.double }}</p>
    <button @click="store.increment">increment</button>
    <button @click="store.reset">reset</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from './useCounter.js';

/**
 * `useCounter()` returns the flat reactive proxy.
 * The Vue adapter has already subscribed to @bocal/core and will call
 * triggerRef whenever the store changes, causing this component to re-render.
 */
const store = useCounter();
</script>
