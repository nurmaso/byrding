// Background service worker. Routes devtools events from content scripts to the
// correct panel port, keyed by inspected tab ID. Also routes breakpoint commands
// from the panel to the content script in the inspected tab.
//
// Protocol:
//   Panel connects with name 'byrding:devtools' and immediately posts
//   { type: 'byrding:init', tabId } so background knows which tab it serves.
//   Content script forwards events via chrome.runtime.sendMessage with
//   { type: 'byrding:event', event }.
//   Panel sends breakpoint commands { type: 'byrding:bp:add' | 'byrding:bp:remove' | 'byrding:bp:clear' }
//   which background routes to the content script via chrome.tabs.sendMessage.

const panelPorts = new Map<number, chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'byrding:devtools') return

  let tabId: number | null = null

  port.onMessage.addListener(
    (msg: { type: string; tabId?: number; [key: string]: unknown }) => {
      if (msg.type === 'byrding:init' && msg.tabId != null) {
        tabId = msg.tabId
        panelPorts.set(tabId, port)
      } else if (
        tabId !== null &&
        (msg.type === 'byrding:bp:add' ||
          msg.type === 'byrding:bp:remove' ||
          msg.type === 'byrding:bp:clear')
      ) {
        // Route breakpoint command from panel to content script in the inspected tab
        chrome.tabs.sendMessage(tabId, msg)
      }
    },
  )

  port.onDisconnect.addListener(() => {
    if (tabId !== null) panelPorts.delete(tabId)
  })
})

// page → panel: route devtools events
chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; event: unknown },
    sender: chrome.runtime.MessageSender,
  ) => {
    if (msg.type !== 'byrding:event' || sender.tab?.id == null) return
    panelPorts.get(sender.tab.id)?.postMessage(msg.event)
  },
)
