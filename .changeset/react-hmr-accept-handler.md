---
"@byrding/react": patch
---

Add Vite HMR self-accept handler to defineStore so Fast Refresh reloads don't bubble to the app root. State preservation is handled by the core registry hot.data fix.
