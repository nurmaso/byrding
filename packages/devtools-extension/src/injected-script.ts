// Runs in the page's main world. Subscribes to the Byrding devtools hook and
// forwards all events to the content script via window.postMessage.
// Also registers breakpoints sent from the panel and evaluates them on each event.

interface Breakpoint {
  id: string
  type: 'action' | 'state'
  storeId: string
  name: string
  condition?: string
}

type AnyEvent = Record<string, unknown>

const breakpoints = new Map<string, Breakpoint>()

function matchesBreakpoint(bp: Breakpoint, event: AnyEvent): boolean {
  if (bp.storeId && event['storeId'] !== bp.storeId) return false
  if (bp.type === 'action') {
    return event['type'] === 'action:before' && event['action'] === bp.name
  }
  return event['type'] === 'state:change' && event['keyPath'] === bp.name
}

function evalCondition(bpId: string, expr: string, event: AnyEvent): boolean {
  try {
    return !!new Function('event', `return (${expr})`)(event)
  } catch (err) {
    // Surface condition errors back to the panel via the existing event pipeline
    window.postMessage(
      {
        source: '__byrding_devtools__',
        event: {
          type: 'byrding:bp:error',
          bpId,
          message: err instanceof Error ? err.message : String(err),
        },
      },
      '*',
    )
    return false
  }
}

;(
  window as Window & {
    __BYRDING_DEVTOOLS__?: { on(handler: (event: unknown) => void): void }
  }
).__BYRDING_DEVTOOLS__?.on((raw) => {
  const event = raw as AnyEvent

  // Forward to content script (existing behaviour)
  window.postMessage({ source: '__byrding_devtools__', event }, '*')

  // Evaluate registered breakpoints
  for (const bp of breakpoints.values()) {
    if (!matchesBreakpoint(bp, event)) continue
    const hit = bp.condition ? evalCondition(bp.id, bp.condition, event) : true
    if (hit) {
      // eslint-disable-next-line no-debugger
      debugger // pauses execution in Sources panel
    }
  }
})

// Receive breakpoint commands relayed from the panel via the content script
window.addEventListener('message', ({ data }: MessageEvent) => {
  if (data?.source !== '__byrding_bp__') return
  if (data.type === 'byrding:bp:add') {
    breakpoints.set(data.config.id, data.config)
  } else if (data.type === 'byrding:bp:remove') {
    breakpoints.delete(data.id)
  } else if (data.type === 'byrding:bp:clear') {
    breakpoints.clear()
  }
})
