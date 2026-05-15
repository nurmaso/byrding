import { writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin, UserConfig } from 'vite'

const ENDPOINT = '/_byrding/context'
const OUTPUT_FILE = '.byrding-context.json'

const INJECTED_SCRIPT = `
window.addEventListener('load', function () {
  setTimeout(function () {
    var hook = window.__BYRDING_DEVTOOLS__
    if (!hook || typeof hook.getContext !== 'function') return
    var ctx = hook.getContext()
    fetch('${ENDPOINT}', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx),
    })
  }, 200)
})
`.trim()

function configureContextEndpoint(server: { middlewares: { use: Function } }, root: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.middlewares.use((req: any, res: any, next: () => void) => {
    if (req.url !== ENDPOINT || req.method !== 'POST') {
      next()
      return
    }

    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8')
        const json = JSON.parse(body) as unknown
        const outPath = resolve(root, OUTPUT_FILE)
        writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf-8')
        res.statusCode = 200
        res.end()
      } catch {
        res.statusCode = 400
        res.end()
      }
    })
  })
}

export function byrdingPlugin(): Plugin {
  let projectRoot = process.cwd()

  return {
    name: 'byrding',

    apply(config: UserConfig, { command }: { command: 'build' | 'serve' }) {
      return command === 'serve' && config.mode !== 'production'
    },

    configResolved(config) {
      projectRoot = config.root
    },

    configureServer(server) {
      configureContextEndpoint(server, projectRoot)
    },

    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: {},
          children: INJECTED_SCRIPT,
          injectTo: 'body' as const,
        },
      ]
    },
  }
}
