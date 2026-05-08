---
"@byrding/core": patch
---

Fix NaN when a class-style computed getter calls another computed getter via `this`.

Class getters were bound to `_proxy`, which wraps only `_raw` (state keys). A getter calling `this.subtotal` would look up `subtotal` on `_raw`, get `undefined`, and produce NaN.

Introduces a thin `bindTarget` proxy for class stores: a wrapper over `_proxy` that intercepts reads of computed keys and routes them through `_getterFns`, while all state reads and writes still flow through `_proxy` and its notification traps.

Closure-style stores are unaffected — their getters reference the closure variable directly and never go through `_proxy` for computed key reads.
