---
"@byrding/react": patch
"@byrding/core": patch
---

`@byrding/react`: `inferComponentName()` — which constructs an `Error` and parses its stack to name the calling component for devtools — was documented as development-only but ran unconditionally on every component's first render, in production bundles too. Its call site in `useStore` is now gated on a literal `process.env.NODE_ENV !== 'production'` check, so bundlers that replace `NODE_ENV` statically (Vite, webpack, esbuild) drop the function from production bundles entirely; in production the component is reported to devtools under its generated `byrding_N` id, which the event payloads already accept. Where `process` is undefined and nothing replaced it (unbundled browser usage), inference is skipped rather than throwing.

`@byrding/core`: fix `isDev()` (introduced in the previous release) reporting *development* inside browser production builds. Bundlers replace `process.env.NODE_ENV` but leave `typeof process` untouched, and `process` does not exist in the browser, so the `typeof process === 'undefined'` guard short-circuited to `true`. `isDev()` now reads `process.env.NODE_ENV` directly inside a try/catch and treats an unreadable value as production. `devWarn` therefore stays silent in production browser bundles as intended.
