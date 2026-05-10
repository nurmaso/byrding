# @byrding/react

## 0.1.3

### Patch Changes

- Updated dependencies
  - @byrding/core@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @byrding/core@0.1.2

## 0.1.1

### Patch Changes

- cbce942: Remove process.env.NODE_ENV guard from inferComponentName — process is not available in all browser build environments without @types/node. Stack-based name inference is lightweight and the try/catch already handles failures gracefully.
- Updated dependencies [7290074]
  - @byrding/core@0.1.1
