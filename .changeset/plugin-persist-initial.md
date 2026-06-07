---
"@byrding/plugin-persist": minor
---

New package: `@byrding/plugin-persist` — localStorage/sessionStorage persistence plugin for @byrding stores.

Syncs selected state keys to storage on every change (`onStateChange`) and rehydrates on store init (`onInit`). Supports per-store and global plugin registration, custom storage backends, key allowlists, serialization overrides, and graceful no-ops when storage is unavailable.
