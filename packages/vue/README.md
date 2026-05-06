# `@byrding/vue`

Vue 3 adapter. Turns a store definition into a composable.

> **AI agents** — see the [consumer agent guidance](https://github.com/nurmaso/byrding/blob/main/.claude/docs/byrding-consumer-agent-guidance.md) for best practices, patterns, and gotchas.

## Install

```bash
npm install @byrding/vue
# or
npx jsr add @byrding/vue
```

## `defineStore(id, definition)`

```ts
function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
): (keyPaths?: string[]) => T
```

Returns a composable callable from any `setup()`.

```ts
// stores/counter.ts
import { defineStore } from '@byrding/vue'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})
```

## Using the composable

```vue
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore(['count'])   // selective subscription
</script>

<template>
  <button @click="store.increment()">
    count: {{ store.count }} — double: {{ store.double }}
  </button>
</template>
```

## How it works

The composable returns a `shallowReactive` wrapper seeded from a spread of the core's merged store:

```ts
const reactiveStore = shallowReactive({ ...coreStore.store }) as T
```

The spread invokes every getter, so the wrapper holds current state values, current computed values, and stable action references.

On every core notification we re-sync the wrapper:

```ts
Object.assign(reactiveStore, coreStore.store)
```

Vue's template system detects which top-level properties changed value and schedules a re-render for components that read them. Because action references stay the same across syncs, templates that read actions (e.g. for `@click` bindings) don't re-render on state changes.

## Cross-framework mutations

When a React component mutates the same shared store, the core's `notify` fires our `syncStore` callback, which re-runs `Object.assign`. Vue picks up the property diff and re-renders — exactly as if the mutation had come from a Vue component.

## Lifecycle

If called inside a component `setup()`, the composable registers `onUnmounted` to tear down the subscription. When called outside a component context (e.g. in a Pinia-style module), `getCurrentInstance()` is `null` and the `onUnmounted` hook is skipped — the subscription lives for the lifetime of the module.

## Peer dependencies

- `vue >= 3`
