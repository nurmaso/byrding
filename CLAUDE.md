# Byrding — CLAUDE.md

> **Read this file first. Load the guidance doc before writing any code.**

---

## What this project is

**Byrding** (`@byrding/*`) is a framework-agnostic state management library with a plugin-extensible architecture. Old Norse: *byrding* = a carrier ship, built to carry cargo across open ocean.

Three publishable packages in a pnpm monorepo:

| Package | Role |
|---------|------|
| `@byrding/core` | Vanilla JS, zero deps. Store registry, Proxy reactivity, subscriptions. |
| `@byrding/react` | React adapter. `defineStore` returns a hook via `useSyncExternalStore`. |
| `@byrding/vue` | Vue adapter. `defineStore` returns a composable via `shallowRef`. |

**Repo:** `github.com/nurmaso/byrding`  
**Toolchain:** pnpm workspaces · tsup (ESM + CJS + `.d.ts`) · Changesets (versioning)

---

## Key documents

Load these before starting any implementation work:

- **Architecture + implementation contract:** `.claude/docs/byrding-refactor-agent-guidance.md`
  — Full source code, type contracts, test requirements, and implementation order. This is the ground truth.
- **Project overview:** `.claude/docs/small-scope-projects-overview.md`
  — Sprint methodology, backlog, and P0 scope boundaries.

---

## Repo structure

```
byrding/
├── CLAUDE.md
├── .claude/
│   └── docs/
│       ├── byrding-refactor-agent-guidance.md   ← read this
│       └── small-scope-projects-overview.md
├── packages/
│   ├── core/        # @byrding/core
│   ├── react/       # @byrding/react
│   └── vue/         # @byrding/vue
├── playground/
│   ├── react-app/
│   └── vue-app/
├── pnpm-workspace.yaml
└── package.json     # private, never published
```

---

## Critical constraints — do not violate these

- **`defineStore` is imported from the framework package, not from core.** Developers never touch `@byrding/core` directly.
- **The hook/composable returns a single flat merged object.** No `state`, `actions`, or `computed` namespacing on the consumer side.
- **Two definition styles are fully supported:** class syntax and closure factory. Both must work identically.
- **`createStore` is idempotent per ID.** First registration wins. Same ID called twice — second definition is silently discarded.
- **Class actions must bind to `_proxy`**, not the raw instance. Otherwise mutations bypass the Proxy `set` trap and subscribers are never notified.
- **Closure actions must not use `this`.** They close over the store variable directly. Do not replace or copy the closure variable — it must stay the same reference as `_raw`.
- **`useSyncExternalStore` subscribe must be referentially stable.** Store it in `useRef`. A new function per render causes an infinite loop.
- **Vue `shallowRef` requires a new object reference on each update.** `getSnapshot` must return `{ ...store._raw }`, not the same object.
- **`classify` must use `getOwnPropertyDescriptors`.** Never read live property values — this would execute getters and hide that they are getters.
- **Computed values are not in the snapshot.** `getSnapshot` returns raw state only.

---

## Implementation order

Execute in this exact sequence. **Do not proceed to the next step until all tests pass.**

1. Scaffold monorepo — `pnpm-workspace.yaml`, three `package.json` files, `tsconfig` per package, shared `tsconfig.base.json`
2. Implement `proxy.ts` — tests: flat set, nested set, array push collapsed to parent path
3. Implement `subscriptions.ts` — tests: single path, ancestor propagation, wildcard, unsubscribe cleanup
4. Implement `classify.ts` — tests: class style and closure style, assert correct bucketing for both
5. Implement `createStore.ts` — tests: flat merged object, class + closure integration
6. Implement `@byrding/react` `defineStore` — React Testing Library: hook returned, action triggers re-render, both definition styles
7. Implement `@byrding/vue` `defineStore` — `@vue/test-utils`: composable returned, action updates template, both definition styles
8. Cross-framework smoke test in `playground/` — shared store mutated in React re-renders Vue component and vice versa

Full source code and test requirements for each step are in `.claude/docs/byrding-refactor-agent-guidance.md`.

---

## P0 out of scope — do not implement

- Plugins API
- Persistence / localStorage middleware
- DevTools integration (Redux DevTools)
- `$patch()` batch update API
- Selector memoisation (`shallowEqual`)
- Array mutation debouncing (`queueMicrotask`)
- Deep Vue reactivity (`reactive()` instead of `shallowRef`)
- Auto dependency tracking (key paths remain explicit)
- Preact, Solid, or Svelte adapters
