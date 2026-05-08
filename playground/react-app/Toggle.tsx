import React from 'react'
import { defineStore } from '@byrding/react'
import { toggleId, toggleDefinition } from '../shared/toggle.store.ts'

const useToggleStore = defineStore(toggleId, toggleDefinition)

export function ToggleComponent() {
  const store = useToggleStore()
  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #555' }}>
      <h3>Toggle — closure factory, chained computed</h3>
      <p>
        <code>isActive</code>: <strong>{store.isActive ? 'true' : 'false'}</strong>
      </p>
      <p>
        <code>label</code> (computed): <strong>{store.label as string}</strong>
      </p>
      <p>
        <code>status</code> (computed → computed): <strong>{store.status as string}</strong>
      </p>
      <button onClick={() => store.toggle()}>Toggle</button>
    </div>
  )
}
