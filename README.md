# react-hook-store

## Todos

- Refactor defineStore to have proper TS handling.
  - Idea to resolve:
    I could move the created actions, getters and methods to a rootStoreMap. This would make them available and I could use them to reference back.
- Add native assign handling to state values. state.value = 'newValue'.
  - This could be integrated with a setter and getter handling (maybe in the root store?)
