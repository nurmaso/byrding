---
"@byrding/core": patch
---

Refactor closure-style accessor notification path to be symmetric with class style: extract `wrappedSet` and share it between the `Object.defineProperty` setter and `_accessorFns[key].set`. No change in external behavior.
