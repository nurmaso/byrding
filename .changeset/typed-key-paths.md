---
"@byrding/core": minor
"@byrding/react": minor
"@byrding/vue": minor
---

**BREAKING (type-level only, no runtime change):** `keyPaths` is now typed against the store.

`useStore(keyPaths?)` in `@byrding/react` and `@byrding/vue`, and `StoreHandle.subscribe(componentId, keyPaths, cb)` in `@byrding/core`, accept `KeyPath<T>[]` instead of `string[]`, where

```ts
type KeyPath<T> = '*' | Key | `${Key}.${string}`   // Key = state and computed keys of T
```

A typo (`['cuont']`) or an action name (`['increment']`) used to compile and silently subscribe to nothing — the component never re-rendered and nothing errored. It is now a compile error. `'*'`, nested object paths (`'user.address.city'`) and array paths (`'items.0'`, `'items.length'`) keep working; only the root segment is checked.

**What breaks:** passing a variable typed as a plain `string[]`:

```ts
const paths: string[] = ['count']
useCounterStore(paths)            // ❌ now a type error
useCounterStore(['count'])        // ✅ literal arrays infer as before
const paths = ['count'] as const  // ✅ or narrow the variable
useCounterStore([...paths])
import type { KeyPath } from '@byrding/core'
const paths: KeyPath<CounterState>[] = ['count']   // ✅ or type it
```

`KeyPath` is exported from `@byrding/core`. Runtime behaviour, including `normaliseKeyPath`, is unchanged.

Repo-only: the `*.test-d.ts` type assertions in core, react and vue are now actually executed by vitest's typecheck (via a per-package `tsconfig.test.json`); previously nothing checked them because the build tsconfig excludes `__tests__`.
