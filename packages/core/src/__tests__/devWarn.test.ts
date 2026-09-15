import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { isDev, devWarn, resetDevWarnings } from '../devWarn.js'

beforeEach(() => {
  resetDevWarnings()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isDev', () => {
  test('true when NODE_ENV is development or test', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(isDev()).toBe(true)
    vi.stubEnv('NODE_ENV', 'test')
    expect(isDev()).toBe(true)
  })

  test('false when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isDev()).toBe(false)
  })

  test('false — and does not throw — when `process` is undefined', () => {
    // A browser production bundle replaces `process.env.NODE_ENV` but never
    // defines `process`; an unbundled browser has neither.  Both must read as
    // production, not development, and must not throw.
    vi.stubGlobal('process', undefined)
    expect(() => isDev()).not.toThrow()
    expect(isDev()).toBe(false)
  })
})

describe('devWarn', () => {
  test('warns with the [byrding] prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    devWarn('something happened')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[byrding] something happened')
  })

  test('emits each distinct message once until reset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    devWarn('dup')
    devWarn('dup')
    devWarn('other')
    expect(warn).toHaveBeenCalledTimes(2)

    resetDevWarnings()
    devWarn('dup')
    expect(warn).toHaveBeenCalledTimes(3)
  })

  test('is a no-op in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    devWarn('silent')
    expect(warn).not.toHaveBeenCalled()
  })
})
