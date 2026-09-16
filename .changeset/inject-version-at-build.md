---
"@byrding/core": patch
---

`getContext().version` now reports the real package version. It was a hardcoded `'0.6.0'` literal that had fallen several releases behind. The version is baked into a generated, tracked `src/version.ts` by `scripts/generate-version.mjs`, which runs from core's `prebuild` hook and from the new root `version-packages` script (`changeset version` followed by regeneration), so both local builds and the changesets "Version Packages" commit keep it in sync. A test compares `getContext().version` against `package.json` read at test time, so any drift fails the suite.
