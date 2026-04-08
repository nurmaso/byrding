/**
 * React smoke-test component.
 *
 * Renders the shared CounterStore's flat API.  No `state.count` or
 * `actions.increment` — everything is top-level on the store object.
 */
import React from 'react';
import { useCounter } from './useCounter.js';

export function Counter() {
  const store = useCounter();

  return (
    <div style={{ fontFamily: 'monospace', padding: '1rem' }}>
      <h2>@bocal/react — Counter (class style)</h2>
      <p>count: {store.count}</p>
      <p>double: {store.double}</p>
      <button onClick={store.increment}>increment</button>{' '}
      <button onClick={store.reset}>reset</button>
    </div>
  );
}
