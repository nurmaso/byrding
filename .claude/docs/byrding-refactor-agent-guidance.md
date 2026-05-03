# Byrding — Technical Refactor Guidance (Code Agent)

> **Scope:** Architecture and implementation contract for refactoring Byrding into a framework-agnostic state management library with a vanilla JS core and per-framework adapter packages.
>
> **Repo:** `github.com/nurmaso/byrding`
> **Sprint constraint:** P0 — core + React adapter + Vue adapter. Everything else is out of scope.

---

## 1. Architecture overview

### 1.1 Core idea

The store is split into two layers:

- **`@byrding/core`** — vanilla JS, zero dependencies. Owns the store registry, Proxy-based change detection, and the subscriber/component update map. Exposes `createStore` (internal primitive, not the public API).
- **`@byrding/react`** and **`@byrding/vue`** — each expose a `defineStore` that wraps the core and returns a framework-native hook/composable directly.

`defineStore` is imported from the **framework package**, not from core. It returns a ready-to-use hook. There is no separate `useStore` call.

```ts
// @byrding/react
import { defineStore } from '@byrding/react'

export const useCounterStore = defineStore('counter', counterDefinition)

// In a component — just call the hook
const store = useCounterStore()
store.count       // state
store.double      // computed
store.increment() // action
```

### 1.2 Flat store object

The hook returns a **single merged object** — state, computed, and actions are all top-level properties. There is no `state`, `computed`, or `actions` namespace on the consumer side.

```ts
// AComponent.tsx
const store = useCounterStore()
store.count        // number
store.double       // number (computed)
store.increment()  // action

// BComponent.tsx — destructuring works too
const { count, double, increment } = useCounterStore()
```

### 1.3 No `state`/`getters`/`actions` split in definition either

The definition is a flat object. Plain values are state, ES `get` accessors are computed, plain functions are actions. The core classifies them internally.

### 1.4 Two definition styles — both fully supported

```ts
// Style A — Class
// `this` is fully typed. Best IDE support.
export class CounterStore {
  count = 0
  get double() { return this.count * 2 }
  increment() { this.count++ }
}

// Style B — Closure factory function
// No class syntax. Self-reference via named variable instead of `this`.
export const counterDefinition = () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
}
```

### 1.5 Cross-framework sharing

Both styles support sharing a store definition across React and Vue. The only requirement is that the **ID and definition are exported from a shared file** and imported into each framework's `defineStore` call. The core registry ensures the store is only initialised once regardless of how many times `defineStore` is called with the same ID.

```ts
// shared/stores/counter.store.ts
export const counterId = 'counter'

// Option A — export a class
export class CounterStore { ... }

// Option B — export a factory function
export const counterDefinition = () => { ... }
```

```ts
// react/stores/counter.ts
import { defineStore } from '@byrding/react'
import { counterId, CounterStore } from '@/shared/stores/counter.store'
export const useCounterStore = defineStore(counterId, CounterStore)

// vue/stores/counter.ts
import { defineStore } from '@byrding/vue'
import { counterId, CounterStore } from '@/shared/stores/counter.store'
export const useCounterStore = defineStore(counterId, CounterStore)
```

Both hooks connect to the same singleton. Mutating state from a React component re-renders any Vue component subscribed to the same keys, and vice versa.

**Inline definitions cannot be shared** — an inline class or inline factory function cannot be imported by another file.

| | Shareable across frameworks |
|---|---|
| Exported class + exported ID | ✅ |
| Exported factory fn + exported ID | ✅ |
| Inline class or inline factory | ❌ |

---

## 2. Package structure

```
byrding/
├── packages/
│   ├── core/                   # @byrding/core — vanilla JS, zero deps
│   │   ├── src/
│   │   │   ├── createStore.ts  # internal store primitive
│   │   │   ├── classify.ts
│   │   │   ├── proxy.ts
│   │   │   ├── subscriptions.ts
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── react/                  # @byrding/react
│   │   ├── src/
│   │   │   ├── defineStore.ts  # public API — returns a React hook
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── vue/                    # @byrding/vue
│       ├── src/
│       │   ├── defineStore.ts  # public API — returns a Vue composable
│       │   └── index.ts
│       └── package.json
│
├── playground/
│   ├── react-app/
│   └── vue-app/
│
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. Core — `@byrding/core`

### 3.1 Concepts

| Concept | Description |
|---|---|
| **Store** | A named, isolated singleton |
| **State entry** | Any non-function, non-getter own property or class field |
| **Action** | Any plain function — own property or class method on prototype |
| **Computed** | Any ES `get` accessor — own or on the prototype |
| **Subscriber** | Any consumer wanting to be notified of state changes |
| **Component ID** | A unique string assigned to each subscriber at subscription time |
| **Key path** | Dot-separated path to a state property, e.g. `"user.name"` |
| **Update map** | `Map<keyPath, Set<componentId>>` — which subscribers care about which keys |
| **Callback map** | `Map<componentId, () => void>` — the notification callbacks |

### 3.2 Detection — class vs closure factory

Both are functions. Told apart by source inspection:

```ts
// packages/core/src/createStore.ts

function isClass(fn: Function): boolean {
  return /^\s*class\s/.test(fn.toString())
}
```

Both normalise to a plain instance:

```ts
const instance: T = isClass(definition)
  ? new (definition as new () => T)()
  : (definition as () => T)()
```

### 3.3 Classification — `classify.ts`

Inspects own properties and the prototype chain. Closure objects have no custom prototype so the prototype walk is a no-op for that style.

```ts
// packages/core/src/classify.ts

export interface Classification {
  stateKeys: string[]
  actionKeys: string[]
  computedKeys: string[]
}

export function classify(instance: object): Classification {
  const stateKeys: string[] = []
  const actionKeys: string[] = []
  const computedKeys: string[] = []

  // Own properties — class fields and closure object properties land here
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(instance)
  )) {
    if (typeof descriptor.get === 'function') {
      computedKeys.push(key)
    } else if (typeof descriptor.value === 'function') {
      actionKeys.push(key)
    } else {
      stateKeys.push(key)
    }
  }

  // Prototype — class methods and getters live here
  const proto = Object.getPrototypeOf(instance)
  if (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue
      const descriptor = Object.getOwnPropertyDescriptor(proto, key)!
      if (typeof descriptor.get === 'function') {
        computedKeys.push(key)
      } else if (typeof descriptor.value === 'function') {
        actionKeys.push(key)
      }
    }
  }

  return { stateKeys, actionKeys, computedKeys }
}
```

### 3.4 Internal store instance

```ts
interface StoreInstance {
  id: string
  _raw: Record<string, unknown>       // state values only
  _proxy: Record<string, unknown>     // Proxy over _raw — `this` for class actions/getters
  _stateKeys: string[]
  _actionKeys: string[]
  _computedKeys: string[]
  _getterFns: Record<string, () => unknown>
  _actionFns: Record<string, (...args: unknown[]) => void>
  _updateMap: Map<string, Set<string>>
  _callbackMap: Map<string, () => void>
  _notify: (keyPath: string) => void
}
```

### 3.5 Merged store object

The core builds a single flat object that exposes state, computed, and actions together. This is what framework adapters hand to components.

```ts
// packages/core/src/createStore.ts

function buildMergedStore<T>(store: StoreInstance): T {
  const merged: Record<string, unknown> = {}

  // State — reads go through the proxy (live values)
  // Writes go through the proxy set trap (triggers notifications)
  for (const key of store._stateKeys) {
    Object.defineProperty(merged, key, {
      get: () => store._proxy[key],
      set: (v) => { store._proxy[key] = v },
      enumerable: true,
    })
  }

  // Computed — evaluated on access, never cached
  for (const key of store._computedKeys) {
    Object.defineProperty(merged, key, {
      get: () => store._getterFns[key](),
      enumerable: true,
    })
  }

  // Actions — already bound functions, assigned directly
  for (const key of store._actionKeys) {
    merged[key] = store._actionFns[key]
  }

  return merged as T
}
```

### 3.6 `createStore` — core primitive

The internal primitive used by framework adapters. Not exported as public API.

```ts
// packages/core/src/createStore.ts

import { classify } from './classify'
import { createReactiveState } from './proxy'
import { subscribe, notify } from './subscriptions'
import { storeRegistry } from './registry'
import type { StoreInstance, CoreStore } from './types'

let _idCounter = 0
export function generateComponentId(): string {
  return `byrding_${++_idCounter}`
}

export function createStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
): CoreStore<T> {

  // Lazy-initialise singleton on first call
  if (!storeRegistry.has(id)) {
    const instance: T = isClass(definition)
      ? new (definition as new () => T)()
      : (definition as () => T)()

    const { stateKeys, actionKeys, computedKeys } = classify(instance)
    const proto = Object.getPrototypeOf(instance)
    const hasProto = proto && proto !== Object.prototype
    const descriptors = Object.getOwnPropertyDescriptors(instance)

    // _raw holds state values only
    const raw: Record<string, unknown> = {}
    for (const key of stateKeys) raw[key] = (instance as any)[key]

    const storeInstance: StoreInstance = {
      id,
      _raw: raw,
      _proxy: null as any,
      _stateKeys: stateKeys,
      _actionKeys: actionKeys,
      _computedKeys: computedKeys,
      _getterFns: {},
      _actionFns: {},
      _updateMap: new Map(),
      _callbackMap: new Map(),
      _notify: (keyPath) => notify(storeInstance, keyPath),
    }

    storeInstance._proxy = createReactiveState(raw, storeInstance._notify)

    // Bind actions — class: bind to proxy so `this` mutations trigger notifications
    //                closure: fn closes over store variable, bind is harmless
    for (const key of actionKeys) {
      const fn = hasProto
        ? (Object.getOwnPropertyDescriptor(proto, key)?.value ?? (instance as any)[key])
        : (instance as any)[key]
      storeInstance._actionFns[key] = fn.bind(storeInstance._proxy)
    }

    // Bind getters — same binding strategy as actions
    for (const key of computedKeys) {
      const descriptor =
        Object.getOwnPropertyDescriptor(instance, key) ??
        (hasProto ? Object.getOwnPropertyDescriptor(proto, key) : undefined)
      if (descriptor?.get) {
        storeInstance._getterFns[key] = descriptor.get.bind(storeInstance._proxy)
      }
    }

    storeRegistry.set(id, storeInstance)
  }

  const store = storeRegistry.get(id)!
  const mergedStore = buildMergedStore<T>(store)

  return {
    // The flat merged object — handed to components
    store: mergedStore,

    // Subscribe a component to specific key paths. Returns unsubscribe.
    subscribe(componentId: string, keyPaths: string[], callback: () => void) {
      return subscribe(store, componentId, keyPaths, callback)
    },

    // Snapshot of raw state only — used by React's useSyncExternalStore
    // to determine whether a re-render is needed
    getSnapshot() {
      return { ...store._raw } as Partial<T>
    },
  }
}
```

### 3.7 Change detection — `proxy.ts`

```ts
// packages/core/src/proxy.ts

export function createReactiveState(
  target: Record<string, unknown>,
  notify: (keyPath: string) => void,
  prefix = '',
): Record<string, unknown> {
  return new Proxy(target, {
    get(obj, key: string) {
      const value = obj[key]
      const path = prefix ? `${prefix}.${key}` : key
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
      ) {
        return createReactiveState(value as Record<string, unknown>, notify, path)
      }
      return value
    },
    set(obj, key: string, value) {
      obj[key] = value
      const path = prefix ? `${prefix}.${key}` : key
      notify(path)
      return true
    },
  })
}
```

Array key path normalisation — collapse index and length writes to the parent path before notifying:

```ts
function normaliseKeyPath(keyPath: string): string {
  return keyPath.replace(/\.\d+$/, '').replace(/\.length$/, '')
}
```

### 3.8 Subscriptions — `subscriptions.ts`

```ts
// packages/core/src/subscriptions.ts

export function subscribe(
  store: StoreInstance,
  componentId: string,
  keyPaths: string[],
  callback: () => void,
): () => void {
  store._callbackMap.set(componentId, callback)
  const isWildcard = keyPaths.includes('*')

  if (isWildcard) {
    if (!store._updateMap.has('*')) store._updateMap.set('*', new Set())
    store._updateMap.get('*')!.add(componentId)
  } else {
    for (const path of keyPaths) {
      if (!store._updateMap.has(path)) store._updateMap.set(path, new Set())
      store._updateMap.get(path)!.add(componentId)
    }
  }

  return () => {
    store._callbackMap.delete(componentId)
    if (isWildcard) {
      store._updateMap.get('*')?.delete(componentId)
    } else {
      for (const path of keyPaths) {
        store._updateMap.get(path)?.delete(componentId)
      }
    }
  }
}

export function notify(store: StoreInstance, rawKeyPath: string): void {
  const keyPath = normaliseKeyPath(rawKeyPath)
  const toNotify = new Set<string>()

  const parts = keyPath.split('.')
  for (let i = parts.length; i > 0; i--) {
    const path = parts.slice(0, i).join('.')
    store._updateMap.get(path)?.forEach((id) => toNotify.add(id))
  }

  store._updateMap.get('*')?.forEach((id) => toNotify.add(id))

  for (const componentId of toNotify) {
    store._callbackMap.get(componentId)?.()
  }
}
```

---

## 4. React adapter — `@byrding/react`

`defineStore` wraps the core `createStore` and returns a React hook directly. The hook is what the developer exports and calls in components.

```ts
// packages/react/src/defineStore.ts

import { useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { createStore, generateComponentId } from '@byrding/core'

export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
) {
  // Register with core once at module load time
  // createStore is idempotent for the same id — safe to call multiple times
  const coreStore = createStore(id, definition)

  // Return the hook — this is what the developer gets back from defineStore
  return function useStore(keyPaths: string[] = ['*']): T {
    const componentIdRef = useRef<string | null>(null)
    if (!componentIdRef.current) {
      componentIdRef.current = generateComponentId()
    }
    const componentId = componentIdRef.current

    // subscribe must be referentially stable for useSyncExternalStore
    const subscribeRef = useRef((onStoreChange: () => void) => {
      return coreStore.subscribe(componentId, keyPaths, onStoreChange)
    })

    // useSyncExternalStore drives re-renders — snapshot is raw state only
    // The component reads from the live merged store object after re-render
    useSyncExternalStore(
      subscribeRef.current,
      coreStore.getSnapshot,
      coreStore.getSnapshot,
    )

    // Return the flat merged store object
    return coreStore.store
  }
}
```

### 4.1 Usage

```ts
// stores/counter.ts
import { defineStore } from '@byrding/react'

export const useCounterStore = defineStore('counter', () => {
  const store = {
    count: 0,
    get double() { return store.count * 2 },
    increment() { store.count++ },
  }
  return store
})
```

```tsx
// AComponent.tsx
import { useCounterStore } from '@/stores/counter'

export function AComponent() {
  const store = useCounterStore()
  return (
    <div>
      <p>{store.count}</p>
      <p>{store.double}</p>
      <button onClick={() => store.increment()}>+</button>
    </div>
  )
}

// BComponent.tsx — destructuring works identically
export function BComponent() {
  const { count, double, increment } = useCounterStore()
  return (
    <div>
      <p>{count}</p>
      <p>{double}</p>
      <button onClick={() => increment()}>+</button>
    </div>
  )
}
```

### 4.2 Selective subscriptions

```tsx
// Only re-renders when `count` changes, not when other keys change
const store = useCounterStore(['count'])
```

---

## 5. Vue adapter — `@byrding/vue`

`defineStore` wraps the core `createStore` and returns a Vue composable directly.

```ts
// packages/vue/src/defineStore.ts

import { shallowRef, onUnmounted, getCurrentInstance } from 'vue'
import { createStore, generateComponentId } from '@byrding/core'

export function defineStore<T extends Record<string, unknown>>(
  id: string,
  definition: (new () => T) | (() => T),
) {
  const coreStore = createStore(id, definition)

  // Return the composable — this is what the developer gets back from defineStore
  return function useStore(keyPaths: string[] = ['*']) {
    const componentId = generateComponentId()

    // shallowRef drives Vue's reactivity — swapping the reference triggers re-render
    const snapshot = shallowRef(coreStore.getSnapshot())

    const unsubscribe = coreStore.subscribe(componentId, keyPaths, () => {
      snapshot.value = coreStore.getSnapshot()
    })

    if (getCurrentInstance()) {
      onUnmounted(unsubscribe)
    }

    // Return the flat merged store object
    return coreStore.store as T
  }
}
```

> **Note for Vue:** Unlike React, Vue's template system can track reactive reads automatically via its own dependency system. The `shallowRef` snapshot swap triggers re-evaluation of the template. The returned `coreStore.store` object has computed properties defined as ES getters, which Vue's template compiler will re-evaluate on each render triggered by the snapshot change.

### 5.1 Usage

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

```vue
<!-- AComponent.vue -->
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'
const store = useCounterStore()
</script>

<template>
  <div>
    <p>{{ store.count }}</p>
    <p>{{ store.double }}</p>
    <button @click="store.increment()">+</button>
  </div>
</template>

<!-- BComponent.vue — destructuring -->
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'
const { count, double, increment } = useCounterStore()
</script>
```

---

## 6. Cross-framework sharing — full example

```ts
// shared/stores/cart.store.ts
// ── exported class style ──────────────────────────────────────────
export const cartId = 'cart'

export class CartStore {
  items: Array<{ id: string; qty: number }> = []
  taxRate = 0.19

  get totalItems() { return this.items.reduce((sum, i) => sum + i.qty, 0) }
  get subtotal()   { return this.items.length * 10 }
  get total()      { return this.subtotal * (1 + this.taxRate) }

  addItem(id: string) {
    const existing = this.items.find((i) => i.id === id)
    if (existing) { existing.qty++ } else { this.items.push({ id, qty: 1 }) }
  }
  removeItem(id: string) {
    this.items = this.items.filter((i) => i.id !== id)
  }
}

// ── OR exported factory style ─────────────────────────────────────
export const cartDefinition = () => {
  const store = {
    items: [] as Array<{ id: string; qty: number }>,
    taxRate: 0.19,
    get totalItems() { return store.items.reduce((sum, i) => sum + i.qty, 0) },
    get subtotal()   { return store.items.length * 10 },
    get total()      { return store.subtotal * (1 + store.taxRate) },
    addItem(id: string) {
      const existing = store.items.find((i) => i.id === id)
      if (existing) { existing.qty++ } else { store.items.push({ id, qty: 1 }) }
    },
    removeItem(id: string) {
      store.items = store.items.filter((i) => i.id !== id)
    },
  }
  return store
}
```

```ts
// react/stores/cart.ts
import { defineStore } from '@byrding/react'
import { cartId, CartStore } from '@/shared/stores/cart.store'
export const useCartStore = defineStore(cartId, CartStore)

// vue/stores/cart.ts
import { defineStore } from '@byrding/vue'
import { cartId, CartStore } from '@/shared/stores/cart.store'
export const useCartStore = defineStore(cartId, CartStore)

// Adding an item from a React component re-renders Vue components
// subscribed to 'items', and vice versa.
```

---

## 7. TypeScript contract

```ts
// packages/core/src/types.ts

export interface StoreInstance {
  id: string
  _raw: Record<string, unknown>
  _proxy: Record<string, unknown>
  _stateKeys: string[]
  _actionKeys: string[]
  _computedKeys: string[]
  _getterFns: Record<string, () => unknown>
  _actionFns: Record<string, (...args: unknown[]) => void>
  _updateMap: Map<string, Set<string>>
  _callbackMap: Map<string, () => void>
  _notify: (keyPath: string) => void
}

// What createStore returns — consumed by framework adapters
export interface CoreStore<T> {
  store: T                                                        // flat merged object
  subscribe: (id: string, paths: string[], cb: () => void) => () => void
  getSnapshot: () => Partial<T>                                   // raw state copy
}
```

Framework adapters do not re-export `CoreStore`. The developer-facing type is inferred from `defineStore`'s return type automatically.

---

## 8. Definition style reference

| | Class | Closure factory |
|---|---|---|
| `this` inside actions/getters | ✅ Fully typed | ⚠️ Use closure variable — avoid `this` |
| Autocomplete | ✅ Full | ✅ Full (via closure variable) |
| Cross-framework sharing | ✅ Export class + ID | ✅ Export factory fn + ID |
| Inline (not shareable) | ❌ Can't be imported | ❌ Can't be imported |
| Inheritance | ✅ Via `extends` | ❌ Not applicable |

---

## 9. Out of scope for P0

- Auto dependency tracking (key paths remain explicit)
- Plugins API
- Persistence / localStorage middleware
- DevTools integration (Redux DevTools) — next sprint
- `$patch()` batch update API
- Selector memoisation (`shallowEqual`)
- Array mutation debouncing (`queueMicrotask`)
- Deep Vue reactivity (`reactive()` instead of `shallowRef`)
- Preact, Solid, or Svelte adapters

---

## 10. Implementation order for the agent

Execute in this exact sequence. Do not proceed until tests pass at each step.

1. **Scaffold monorepo** — `pnpm-workspace.yaml`, three `package.json` files, `tsconfig` per package, shared `tsconfig.base.json`.
2. **Implement `proxy.ts`** — unit tests: flat `set`, nested `set`, array push collapsed to parent path.
3. **Implement `subscriptions.ts`** — unit tests: single path subscribe/notify, ancestor propagation, wildcard, unsubscribe cleanup.
4. **Implement `classify.ts`** — unit tests: class with fields/methods/getters, closure object with own properties/getters/functions. Assert correct bucketing for both styles.
5. **Implement `createStore.ts`** — unit tests: `buildMergedStore` produces correct flat object. Integration tests: (a) class style — create store, call action on merged object, assert subscriber fired; (b) closure style — same.
6. **Implement `@byrding/react` `defineStore`** — React Testing Library: `defineStore` returns a hook; mount component, call action, assert re-render. Test both definition styles.
7. **Implement `@byrding/vue` `defineStore`** — `@vue/test-utils`: `defineStore` returns a composable; mount component, call action, assert updated template. Test both definition styles.
8. **Cross-framework smoke test** in `playground/`: shared `CartStore` class imported by both React and Vue `defineStore`. Action called in React component updates Vue component and vice versa.

---

## 11. Key constraints and gotchas

- **`defineStore` is imported from the framework package, not core.** `@byrding/core` exports `createStore` (internal) only. Developers never import from core directly.
- **`createStore` is idempotent per ID.** The second call with the same ID returns the existing singleton. The second definition is silently discarded. The first registration wins — document this clearly.
- **Inline definitions cannot be shared.** An inline class or inline factory passed directly to `defineStore` is not importable. Cross-framework sharing requires exporting both the ID and the definition from a shared file.
- **`classify` must use `getOwnPropertyDescriptors`.** Reading live property values would execute ES getters and return their value type, hiding that they are getters.
- **Class actions bind to `_proxy`.** `this.count++` must go through the Proxy `set` trap. Binding to the raw instance bypasses all subscribers silently.
- **Closure actions don't use `this`.** They mutate the closure variable which is the same object reference as `_raw`. The Proxy intercepts those writes via `set`. Do not replace or copy the closure variable — it must stay the same reference as `_raw`.
- **`buildMergedStore` state properties use `get`/`set` descriptors**, not direct value assignment. This ensures reads always return the current live value through the proxy, and writes go through the proxy `set` trap.
- **`useSyncExternalStore` requires a stable `subscribe` reference.** Store in `useRef`. A new function on every render causes an infinite loop.
- **Vue `shallowRef` requires a new object reference on each update.** `getSnapshot` returns `{ ...store._raw }` — a fresh object every call.
- **Computed values are not in the snapshot.** `getSnapshot` returns raw state only. React uses the snapshot to detect *whether* to re-render, not as what gets rendered. Computed values are re-evaluated from the merged object's getters after each render.
- **Circular references in state are not supported.** State must be plain serialisable objects.
- **Class inheritance is allowed but discouraged for P0.** `classify` walks one level of the prototype chain only.
