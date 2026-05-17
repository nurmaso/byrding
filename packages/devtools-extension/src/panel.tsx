import { useEffect, useReducer } from 'react'
import { createRoot } from 'react-dom/client'

type AnyEvent = { type: string; [key: string]: unknown }
type LogEntry = { id: number; event: AnyEvent }

type State = { connected: boolean; log: LogEntry[] }
type Action =
  | { type: 'set_connected'; connected: boolean }
  | { type: 'add_event'; event: AnyEvent }
  | { type: 'clear' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set_connected':
      return { ...state, connected: action.connected }
    case 'add_event':
      return {
        ...state,
        log: [...state.log, { id: Date.now() + Math.random(), event: action.event }],
      }
    case 'clear':
      return { ...state, log: [] }
  }
}

const EVENT_COLORS: Record<string, string> = {
  'store:init': '#d1fae5',
  'state:change': '#dbeafe',
  'action:before': '#fef3c7',
  'action:after': '#fef9c3',
  'component:mounted': '#ede9fe',
  'component:rendered': '#f3e8ff',
  'component:unmounted': '#fee2e2',
}

function App() {
  const [state, dispatch] = useReducer(reducer, { connected: false, log: [] })

  useEffect(() => {
    function checkConnection() {
      chrome.devtools.inspectedWindow.eval(
        "typeof window.__BYRDING_DEVTOOLS__ !== 'undefined'",
        (result: unknown) => {
          dispatch({ type: 'set_connected', connected: result === true })
        },
      )
    }

    checkConnection()

    const port = chrome.runtime.connect({ name: 'byrding:devtools' })
    port.postMessage({ type: 'byrding:init', tabId: chrome.devtools.inspectedWindow.tabId })

    port.onMessage.addListener((event: AnyEvent) => {
      dispatch({ type: 'add_event', event })
    })

    function onNavigated() {
      dispatch({ type: 'clear' })
      dispatch({ type: 'set_connected', connected: false })
      // Give the page 500ms to reinstall the hook before re-checking
      setTimeout(checkConnection, 500)
    }

    chrome.devtools.network.onNavigated.addListener(onNavigated)

    return () => {
      port.disconnect()
      chrome.devtools.network.onNavigated.removeListener(onNavigated)
    }
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Byrding DevTools</span>
        <span
          style={{
            ...styles.badge,
            ...(state.connected ? styles.connected : styles.notConnected),
          }}
        >
          {state.connected ? 'Connected' : 'Not detected'}
        </span>
        {state.log.length > 0 && (
          <button style={styles.clearBtn} onClick={() => dispatch({ type: 'clear' })}>
            Clear
          </button>
        )}
      </div>

      {state.log.length === 0 ? (
        <p style={styles.empty}>No events yet. Interact with the page to see store events.</p>
      ) : (
        <div style={styles.log}>
          {state.log.map((entry) => (
            <EventRow key={entry.id} event={entry.event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({ event }: { event: AnyEvent }) {
  const bg = EVENT_COLORS[event.type] ?? '#f9fafb'
  return (
    <details style={{ ...styles.row, background: bg }}>
      <summary style={styles.summary}>
        <span style={styles.eventType}>{event.type}</span>
        {event.storeId != null && (
          <span style={styles.meta}> · {String(event.storeId)}</span>
        )}
        {event.action != null && (
          <span style={styles.meta}> · {String(event.action)}</span>
        )}
        {event.keyPath != null && (
          <span style={styles.meta}> · {String(event.keyPath)}</span>
        )}
      </summary>
      <pre style={styles.json}>{JSON.stringify(event, null, 2)}</pre>
    </details>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '12px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  title: { fontWeight: 600, fontSize: '13px' },
  badge: { padding: '2px 8px', borderRadius: '3px', fontSize: '11px' },
  connected: { background: '#d1fae5', color: '#065f46' },
  notConnected: { background: '#fee2e2', color: '#991b1b' },
  clearBtn: {
    marginLeft: 'auto',
    padding: '2px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    background: '#f9fafb',
  },
  empty: { color: '#6b7280', padding: '16px 12px', margin: 0 },
  log: { overflowY: 'auto', flex: 1 },
  row: { borderBottom: '1px solid rgba(0,0,0,0.06)' },
  summary: {
    padding: '4px 12px',
    listStyle: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  eventType: { fontWeight: 600, color: '#1f2937' },
  meta: { color: '#6b7280' },
  json: {
    margin: 0,
    padding: '8px 12px 8px 24px',
    fontSize: '11px',
    color: '#374151',
    background: 'rgba(0,0,0,0.02)',
    overflow: 'auto',
  },
}

createRoot(document.getElementById('root')!).render(<App />)
