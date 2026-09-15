import { renderHook } from '@testing-library/react'
import { resetRegistry, installDevtoolsHook, getDevtoolsHook, type DevtoolsEvent } from '@byrding/core'
import { defineStore } from '../defineStore.js'

// `inferComponentName` parses `new Error().stack` to find the calling
// component's name.  That is dev-only tooling: in production the call site is
// gated on `isDev()` and the component name falls back to the generated
// `byrding_N` component id, which the devtools payload already accepts.

type DevtoolsGlobal = typeof globalThis & { __BYRDING_DEVTOOLS__?: unknown }

let events: DevtoolsEvent[]
let off: () => void

beforeEach(() => {
  resetRegistry()
  installDevtoolsHook()
  events = []
  off = getDevtoolsHook()!.on((e) => { events.push(e) })
})

afterEach(() => {
  off()
  delete (globalThis as DevtoolsGlobal).__BYRDING_DEVTOOLS__
  vi.unstubAllEnvs()
})

function mountedEvent() {
  const e = events.find((e) => e.type === 'component:mounted')
  if (!e || e.type !== 'component:mounted') throw new Error('no component:mounted event')
  return e
}

test('development: component:mounted carries the inferred component name', () => {
  vi.stubEnv('NODE_ENV', 'development')
  const useCounter = defineStore('devmode-dev', () => ({ count: 0 }))

  renderHook(() => useCounter())

  const e = mountedEvent()
  expect(e.name).not.toBe(e.componentId)
  expect(e.name).not.toMatch(/^byrding_\d+$/)
})

test('production: component:mounted name is the generated component id', () => {
  vi.stubEnv('NODE_ENV', 'production')
  const useCounter = defineStore('devmode-prod', () => ({ count: 0 }))

  renderHook(() => useCounter())

  const e = mountedEvent()
  expect(e.name).toBe(e.componentId)
  expect(e.name).toMatch(/^byrding_\d+$/)
})
