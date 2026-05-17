import { createStore } from '../createStore.js'
import { installDevtoolsHook, getDevtoolsHook } from '../devtoolsPlugin.js'
import { resetRegistry } from '../registry.js'

const w = globalThis as typeof globalThis & { __BYRDING_DEVTOOLS__?: unknown }

beforeEach(() => {
  resetRegistry()
  delete w.__BYRDING_DEVTOOLS__
})

test('installDevtoolsHook exposes getContext on window.__BYRDING_DEVTOOLS__', () => {
  installDevtoolsHook()
  const hook = getDevtoolsHook()
  expect(typeof hook?.getContext).toBe('function')
})

test('hook.getContext() returns same value as direct getContext() import', async () => {
  const { getContext } = await import('../getContext.js')

  createStore('hookTest', () => {
    const store = { count: 5, noop() {} }
    return store
  })

  installDevtoolsHook()
  const hook = getDevtoolsHook()!
  const fromHook = hook.getContext()
  const fromDirect = getContext()

  expect(fromHook.stores['hookTest'].state.count).toBe(5)
  expect(fromHook.stores['hookTest'].state.count).toBe(fromDirect.stores['hookTest'].state.count)
})

test('hook.getContext() present even with no DevTools panel connected', () => {
  installDevtoolsHook()
  const hook = getDevtoolsHook()!
  expect(() => hook.getContext()).not.toThrow()
})
