# @byrding/vite

## 0.2.0

### Minor Changes

- Add `@byrding/vite` package with `byrdingPlugin()` — a Vite dev-server plugin that injects a browser snippet to call `window.__BYRDING_DEVTOOLS__.getContext()` and POST the result to `/_byrding/context`, writing `.byrding-context.json` to the project root on every page load. No-op in production mode.
