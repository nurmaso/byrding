import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './app.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode intentionally disabled — it double-invokes renders in development
  // which would confuse the render-count visualisation.
  <App />,
)
