---
"@byrding/core": minor
"@byrding/react": patch
"@byrding/vue": patch
---

Add `$reset()` method to every store instance. Calling `store.$reset()` restores all state keys to their initial values in a single operation, only notifying subscribers for keys that actually changed. Both class and closure definition styles are supported.
