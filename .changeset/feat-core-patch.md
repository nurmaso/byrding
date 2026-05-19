---
"@byrding/core": minor
---

Add `$patch()` — batch state update with a single subscriber notification (#92).

`store.$patch({ key: value, ... })` applies multiple state mutations atomically.
Subscribers are notified exactly once regardless of how many keys changed, preventing
redundant React re-renders from multi-key updates.

- Unknown keys are silently ignored.
- Keys whose value is strictly unchanged are skipped (no notification if nothing changed).
- Plugin `onStateChange` fires per changed key; subscribers fire once via `notify('*')`.
- Snapshot cache is invalidated once; cross-store deps are propagated once.
