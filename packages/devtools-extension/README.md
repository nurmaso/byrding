# @byrding/devtools-extension

Chrome DevTools extension for inspecting Byrding stores.

## Build

```sh
pnpm build
```

Output is written to `dist/`.

## Load unpacked in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `packages/devtools-extension/dist` directory

The **Byrding** panel will appear in Chrome DevTools (F12) when inspecting any page.

## Status indicator

The panel displays:

- **Connected** — `window.__BYRDING_DEVTOOLS__` detected on the inspected page (Byrding is installed and active)
- **Not detected** — Byrding is not present on the inspected page

To get the Connected status, install `@byrding/core` in your app and call `installDevtoolsHook()` from `@byrding/core`.
