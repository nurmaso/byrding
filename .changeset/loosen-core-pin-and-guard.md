---
"@byrding/react": patch
"@byrding/vue": patch
"@byrding/core": patch
---

`@byrding/react` / `@byrding/vue`: depend on `@byrding/core` with a caret range instead of an exact pin. The adapters declared `workspace:*`, which pnpm rewrites to the exact core version at publish (`"0.10.0"`); it is now `workspace:^` (`"^0.10.0"`). With an exact pin, upgrading one adapter but not the other installed two copies of core — and therefore two store registries — which silently broke cross-framework sharing. The JSR manifests get the same treatment: their `@byrding/core` import was pinned to `^0.0.1` (unresolvable against current core) and is now synced to a caret range on the released core version at publish time.

`@byrding/core`: add a development-only duplicate-instance guard. On first initialisation core stamps `globalThis` under `Symbol.for('byrding.core.instance')`; if a second copy of core initialises afterwards it warns once, naming both versions and explaining that two copies mean two registries. Vite HMR re-evaluation of the same copy is recognised via `import.meta.hot.data` and stays silent. No-op in production.
