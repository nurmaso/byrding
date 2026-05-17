import { describe, test, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import { byrdingPlugin } from '../index.js'
import type { Plugin } from 'vite'
import * as fs from 'fs'

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
}))

// ─── apply() ─────────────────────────────────────────────────────────────────

describe('apply()', () => {
  test('active when command=serve and mode≠production', () => {
    const plugin = byrdingPlugin() as Plugin & { apply: Function }
    expect(plugin.apply({}, { command: 'serve' })).toBe(true)
  })

  test('inactive when command=build', () => {
    const plugin = byrdingPlugin() as Plugin & { apply: Function }
    expect(plugin.apply({}, { command: 'build' })).toBe(false)
  })

  test('inactive when mode=production even in serve', () => {
    const plugin = byrdingPlugin() as Plugin & { apply: Function }
    expect(plugin.apply({ mode: 'production' }, { command: 'serve' })).toBe(false)
  })
})

// ─── transformIndexHtml ───────────────────────────────────────────────────────

describe('transformIndexHtml()', () => {
  test('injects a script tag into body', () => {
    const plugin = byrdingPlugin() as Plugin & { transformIndexHtml: Function }
    const tags = plugin.transformIndexHtml()
    expect(Array.isArray(tags)).toBe(true)
    expect(tags).toHaveLength(1)
    const [tag] = tags
    expect(tag.tag).toBe('script')
    expect(tag.injectTo).toBe('body')
    expect(tag.children).toContain('/_byrding/context')
    expect(tag.children).toContain('__BYRDING_DEVTOOLS__')
    expect(tag.children).toContain('getContext')
  })
})

// ─── configureServer middleware ───────────────────────────────────────────────

type ConnectMiddleware = (req: any, res: any, next: () => void) => void

function buildMockServer() {
  const middlewares: ConnectMiddleware[] = []
  return {
    middlewares: {
      use(fn: ConnectMiddleware) { middlewares.push(fn) },
      _all: middlewares,
    },
  }
}

function makeRequest(method: string, url: string, body?: string): any {
  const req = new EventEmitter() as any
  req.method = method
  req.url = url
  if (body !== undefined) {
    process.nextTick(() => {
      req.emit('data', Buffer.from(body))
      req.emit('end')
    })
  }
  return req
}

function makeResponse(): any {
  const res: any = { statusCode: 0, _ended: false }
  res.end = () => { res._ended = true; return res }
  return res
}

describe('configureServer middleware', () => {
  beforeEach(() => {
    vi.mocked(fs.writeFileSync).mockClear()
  })

  test('ignores non-matching requests', () => {
    const plugin = byrdingPlugin() as Plugin & {
      configResolved: Function
      configureServer: Function
    }
    plugin.configResolved({ root: '/project' })
    const server = buildMockServer()
    plugin.configureServer(server)

    const [mw] = server.middlewares._all
    const req = makeRequest('GET', '/other')
    const res = makeResponse()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res._ended).toBe(false)
  })

  test('ignores POST to wrong path', () => {
    const plugin = byrdingPlugin() as Plugin & {
      configResolved: Function
      configureServer: Function
    }
    plugin.configResolved({ root: '/project' })
    const server = buildMockServer()
    plugin.configureServer(server)

    const [mw] = server.middlewares._all
    const req = makeRequest('POST', '/other')
    const res = makeResponse()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test('writes .byrding-context.json on valid POST', () =>
    new Promise<void>((done) => {
      const plugin = byrdingPlugin() as Plugin & {
        configResolved: Function
        configureServer: Function
      }
      plugin.configResolved({ root: '/project' })
      const server = buildMockServer()
      plugin.configureServer(server)

      const [mw] = server.middlewares._all
      const payload = JSON.stringify({ version: '0.6.0', stores: {} })
      const req = makeRequest('POST', '/_byrding/context', payload)
      const res = makeResponse()
      const next = vi.fn()

      res.end = () => {
        expect(res.statusCode).toBe(200)
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '/project/.byrding-context.json',
          JSON.stringify({ version: '0.6.0', stores: {} }, null, 2),
          'utf-8',
        )
        done()
        return res
      }

      mw(req, res, next)
    }))

  test('returns 400 on invalid JSON', () =>
    new Promise<void>((done) => {
      const plugin = byrdingPlugin() as Plugin & {
        configResolved: Function
        configureServer: Function
      }
      plugin.configResolved({ root: '/project' })
      const server = buildMockServer()
      plugin.configureServer(server)

      const [mw] = server.middlewares._all
      const req = makeRequest('POST', '/_byrding/context', 'not-json')
      const res = makeResponse()
      const next = vi.fn()

      res.end = () => {
        expect(res.statusCode).toBe(400)
        expect(fs.writeFileSync).not.toHaveBeenCalled()
        done()
        return res
      }

      mw(req, res, next)
    }))
})
