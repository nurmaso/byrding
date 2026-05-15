// Relays Byrding devtools events from the page's main world to the background
// service worker. The injected script (running in MAIN world) posts events via
// window.postMessage; this isolated-world script picks them up and forwards them.
window.addEventListener('message', ({ data }: MessageEvent) => {
  if (data?.source !== '__byrding_devtools__') return
  chrome.runtime.sendMessage({ type: 'byrding:event', event: data.event })
})
