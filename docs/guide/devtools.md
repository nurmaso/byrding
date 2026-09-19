# Devtools

Three pieces, all optional and independent: an in-page **hook** that stores and components emit events to, a **Chrome extension** that renders them, and a **Vite plugin** that writes a snapshot of every store to disk for LLM tooling.

## The hook and `devtoolsPlugin()`

```ts
// main.ts — before any store is created
import { configureByrding, devtoolsPlugin } from '@byrding/core'
configureByrding({ plugins: [devtoolsPlugin()] })
```

`devtoolsPlugin()` installs `window.__BYRDING_DEVTOOLS__` (once) and returns a plugin that emits:

| Event | When | Payload |
| --- | --- | --- |
| `store:init` | a store is registered | `storeId`, `state`, `stateKeys` |
| `state:change` | any write | `storeId`, `keyPath`, `oldValue`, `newValue` |
| `action:before` | an action is called | `storeId`, `action`, `args` |

The adapters add, whenever the hook exists:

| Event | React | Vue |
| --- | --- | --- |
| `component:mounted` | on first subscription; `name` inferred from the call stack (development builds only, otherwise the component id) | in `setup()`; `name` from `getCurrentInstance()` |
| `component:rendered` | each store-driven re-render, with `renderCount` | each re-sync, with `renderCount` |
| `component:unmounted` | on unsubscribe | on `onUnmounted` |

Subscribe programmatically with `getDevtoolsHook()?.on(event => …)`; it returns an unsubscribe function. Every event carries a `timestamp`.

## Chrome extension

Built from [`packages/devtools-extension`](https://github.com/nurmaso/byrding/tree/main/packages/devtools-extension):

```sh
pnpm --filter @byrding/devtools-extension build
```

Then `chrome://extensions` → Developer mode → Load unpacked → select `packages/devtools-extension/dist`. A **Byrding** panel appears in DevTools; it shows *Connected* when `window.__BYRDING_DEVTOOLS__` is present on the inspected page.

## `getContext()`

```ts
import { getContext } from '@byrding/core'
getContext()
// { version: '0.11.0', timestamp: '…', stores: { cart: { state, stateSchema, actions, computed, subscriberCount } } }
```

A JSON-safe description of every registered store — current state, `typeof` of each state key, action names, evaluated computed values, and subscriber count — plus the installed core version. The hook exposes the same function as `getContext()`.

## `@byrding/vite`

```ts
// vite.config.ts
import { byrdingPlugin } from '@byrding/vite'
export default defineConfig({ plugins: [react(), byrdingPlugin()] })
```

Active only for `vite dev` outside production mode. It injects a small script into `index.html` that, shortly after page load, POSTs `hook.getContext()` to `/_byrding/context`; the dev server writes the payload to **`.byrding-context.json`** in the project root. Point an AI assistant at that file for an accurate picture of your stores. Requires the devtools hook to be installed (register `devtoolsPlugin()` or call `installDevtoolsHook()`).

## Production

Nothing here runs in production unless you register the plugin there. The React component-name inference is compiled out of production bundles regardless.
