---
"@byrding/vue": patch
---

Add Vite HMR self-accept handler so the defineStore module self-accepts hot reloads instead of propagating them to the app root. The shallowReactive in useStore() re-syncs automatically on the next composable call because createStore returns the preserved instance from the core registry.
