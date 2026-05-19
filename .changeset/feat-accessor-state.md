---
"@byrding/core": minor
---

feat: reactive get/set property accessors

Properties with both a getter and setter are now classified as accessor state rather than
computed. Writes go through the reactive surface and notify subscribers; getSnapshot()
includes the getter's current value for each accessor key.
