import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type ConnectionStatus = 'connected' | 'not-detected' | 'checking'

function App() {
  const [status, setStatus] = useState<ConnectionStatus>('checking')

  useEffect(() => {
    chrome.devtools.inspectedWindow.eval(
      "typeof window.__BYRDING_DEVTOOLS__ !== 'undefined'",
      (result: unknown, isException: chrome.devtools.inspectedWindow.EvaluationExceptionInfo | boolean) => {
        if (isException) {
          setStatus('not-detected')
        } else {
          setStatus(result === true ? 'connected' : 'not-detected')
        }
      },
    )
  }, [])

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Byrding DevTools</h2>
      <div
        style={{
          ...styles.badge,
          ...(status === 'connected'
            ? styles.connected
            : status === 'not-detected'
              ? styles.notDetected
              : styles.checking),
        }}
      >
        {status === 'connected' && 'Byrding DevTools — Connected'}
        {status === 'not-detected' && 'Byrding DevTools — Not detected'}
        {status === 'checking' && 'Byrding DevTools — Checking…'}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { fontFamily: 'system-ui, sans-serif', padding: '16px' },
  heading: { margin: '0 0 12px', fontSize: '14px', fontWeight: 600 },
  badge: { display: 'inline-block', padding: '6px 12px', borderRadius: '4px', fontSize: '13px' },
  connected: { background: '#d1fae5', color: '#065f46' },
  notDetected: { background: '#fee2e2', color: '#991b1b' },
  checking: { background: '#f3f4f6', color: '#374151' },
}

const root = document.getElementById('root')!
createRoot(root).render(<App />)
