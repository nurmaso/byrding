import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkSingleInstance, _resetInstanceGuard } from '../instanceGuard.js'
import { resetDevWarnings } from '../devWarn.js'
import { VERSION } from '../version.js'

// Two copies of @byrding/core in one page means two store registries: stores
// defined through one copy are invisible to the other and cross-framework
// sharing — the library's headline feature — silently breaks.  The guard
// stamps `globalThis` on first initialisation and warns if another copy
// initialises afterwards.  Development only.

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  _resetInstanceGuard()
  resetDevWarnings()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  _resetInstanceGuard()
})

describe('checkSingleInstance', () => {
  test('first initialisation is silent', () => {
    checkSingleInstance()
    expect(warn).not.toHaveBeenCalled()
  })

  test('a second initialisation warns once, naming the versions', () => {
    checkSingleInstance()
    checkSingleInstance()
    checkSingleInstance()

    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0][0])
    expect(message).toMatch(/two copies of @byrding\/core/i)
    expect(message).toContain(VERSION)
  })

  test('HMR re-evaluation of the same copy (hot.data marker present) is silent', () => {
    const hotData: Record<string, unknown> = {}
    checkSingleInstance(hotData)
    // Simulate Vite swapping the module: same hot.data object survives.
    checkSingleInstance(hotData)
    checkSingleInstance(hotData)
    expect(warn).not.toHaveBeenCalled()
  })

  test('a genuine second copy under Vite dev (separate hot.data) still warns', () => {
    checkSingleInstance({})
    checkSingleInstance({})
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('production: never stamps, never warns', () => {
    vi.stubEnv('NODE_ENV', 'production')
    checkSingleInstance()
    checkSingleInstance()
    expect(warn).not.toHaveBeenCalled()
    expect(Object.getOwnPropertySymbols(globalThis).map(String)).not.toContain('Symbol(byrding.core.instance)')
  })
})

describe('module initialisation', () => {
  test('evaluating @byrding/core a second time warns about a duplicate copy', async () => {
    vi.resetModules()
    await import('../index.js')
    expect(warn).not.toHaveBeenCalled()

    // A second evaluation of the package's module graph is what a second
    // installed copy looks like at runtime.
    vi.resetModules()
    await import('../index.js')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toMatch(/two copies of @byrding\/core/i)
  })
})
