// Runs in the page's main world. Subscribes to the Byrding devtools hook
// and forwards all events to the content script via window.postMessage.
// Content scripts live in an isolated world and cannot reach window.__BYRDING_DEVTOOLS__ directly.
;(
  window as Window & {
    __BYRDING_DEVTOOLS__?: { on(handler: (event: unknown) => void): void }
  }
).__BYRDING_DEVTOOLS__?.on((event) => {
  window.postMessage({ source: '__byrding_devtools__', event }, '*')
})
