// Background service worker. Routes devtools events from content scripts to the
// correct panel port, keyed by inspected tab ID.
//
// Protocol:
//   Panel connects with name 'byrding:devtools' and immediately posts
//   { type: 'byrding:init', tabId } so background knows which tab it serves.
//   Content script forwards events via chrome.runtime.sendMessage with
//   { type: 'byrding:event', event }.

const panelPorts = new Map<number, chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'byrding:devtools') return

  let tabId: number | null = null

  port.onMessage.addListener((msg: { type: string; tabId?: number }) => {
    if (msg.type === 'byrding:init' && msg.tabId != null) {
      tabId = msg.tabId
      panelPorts.set(tabId, port)
    }
  })

  port.onDisconnect.addListener(() => {
    if (tabId !== null) panelPorts.delete(tabId)
  })
})

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; event: unknown },
    sender: chrome.runtime.MessageSender,
  ) => {
    if (msg.type !== 'byrding:event' || sender.tab?.id == null) return
    panelPorts.get(sender.tab.id)?.postMessage(msg.event)
  },
)
