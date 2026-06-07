# @byrding/plugin-persist

## 0.2.0

### Minor Changes

- e4f87fd: New package: `@byrding/plugin-persist` — localStorage/sessionStorage persistence plugin for @byrding stores.

  Syncs selected state keys to storage on every change (`onStateChange`) and rehydrates on store init (`onInit`). Supports per-store and global plugin registration, custom storage backends, key allowlists, serialization overrides, and graceful no-ops when storage is unavailable.

### Patch Changes

- Updated dependencies [00f424f]
- Updated dependencies [de6074f]
  - @byrding/core@0.10.1
