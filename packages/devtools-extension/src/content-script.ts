// Relays Byrding devtools events from the page's main world to the background
// service worker. The injected script (running in MAIN world) posts events via
// window.postMessage; this isolated-world script picks them up and forwards them.
// Also relays breakpoint commands from the background to the injected script.

// page → background: devtools events
window.addEventListener('message', ({ data }: MessageEvent) => {
  if (data?.source !== '__byrding_devtools__') return
  chrome.runtime.sendMessage({ type: 'byrding:event', event: data.event })
})

// background → page: breakpoint commands from the panel
chrome.runtime.onMessage.addListener(
  (msg: { type: string; [key: string]: unknown }) => {
    if (
      msg.type !== 'byrding:bp:add' &&
      msg.type !== 'byrding:bp:remove' &&
      msg.type !== 'byrding:bp:clear'
    )
      return
    window.postMessage({ source: '__byrding_bp__', ...msg }, '*')
  },
)
