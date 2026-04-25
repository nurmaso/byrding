import { Controls } from './components/Controls'
import { StoreSection } from './components/StoreSection'
import { PropsSection } from './components/PropsSection'

export function App() {
  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="app__header">
        <h1 className="app__title">@byrding/react — Re-render Visualiser</h1>
        <p className="app__subtitle">
          Badges flash{' '}
          <span className="highlight highlight--amber">amber</span> on each
          render, then fade grey. Compare the two columns after clicking the
          buttons below.
        </p>
      </header>

      {/* ── Controls ────────────────────────────────────────────── */}
      <Controls />

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="legend">
        <div className="legend__item">
          <span className="legend__dot legend__dot--blue" />
          <strong>Store</strong> — component subscribes only to the keys it
          reads. Other mutations are invisible to it.
        </div>
        <div className="legend__item">
          <span className="legend__dot legend__dot--red" />
          <strong>Props</strong> — parent connects to everything, children
          re-render whenever the parent does (no memo).
        </div>
      </div>

      {/* ── Two-column comparison ────────────────────────────────── */}
      <div className="columns">
        <div className="column column--store">
          <h2 className="column__title column__title--blue">
            Store (selective subscriptions)
          </h2>
          <StoreSection />
        </div>

        <div className="column column--props">
          <h2 className="column__title column__title--red">
            Props (prop drilling)
          </h2>
          <PropsSection />
        </div>
      </div>
    </div>
  )
}
