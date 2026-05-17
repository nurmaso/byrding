// Runs in the page's main world at document_start — before any page scripts.
// Pre-installs window.__BYRDING_DEVTOOLS__ so the Byrding library reuses it
// (installDevtoolsHook() skips creation when the property already exists).
// Registers a subscriber that forwards every emitted event to the content
// script via window.postMessage, which relays them to the DevTools panel.
;(function () {
  type Hook = {
    emit(event: unknown): void
    on(handler: (event: unknown) => void): () => void
  }
  const w = window as Window & { __BYRDING_DEVTOOLS__?: Hook }
  if (!w.__BYRDING_DEVTOOLS__) {
    const handlers = new Set<(event: unknown) => void>()
    w.__BYRDING_DEVTOOLS__ = {
      emit(event) {
        handlers.forEach((h) => h(event))
      },
      on(handler) {
        handlers.add(handler)
        return () => handlers.delete(handler)
      },
    }
  }
  w.__BYRDING_DEVTOOLS__.on((event) => {
    window.postMessage({ source: '__byrding_devtools__', event }, '*')
  })
})()
