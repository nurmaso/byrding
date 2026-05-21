---
"@byrding/core": patch
---

Fix three accessor state bugs: $patch() now applies accessor keys via their setter; onInit plugin snapshot includes accessor values; accessor getters in buildMergedStore now participate in cross-store dep tracking.
