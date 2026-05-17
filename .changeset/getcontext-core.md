---
"@byrding/core": minor
---

Add `getContext()` — walks `storeRegistry` and returns a fully serializable `ByrdingContext` snapshot (state, stateSchema, actions, computed, subscriberCount per store). Tree-shakeable named export. Designed for LLM prompt injection and `.byrding-context.json` generation.
