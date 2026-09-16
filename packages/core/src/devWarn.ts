/**
 * devWarn.ts
 *
 * Development-only diagnostics.  Every warning is prefixed with `[byrding]`,
 * emitted at most once per distinct message, and silent in production.
 *
 * `isDev()` reads `process.env.NODE_ENV` as a bare member expression, which is
 * the form every mainstream bundler replaces statically (Vite does so in both
 * its dev transform and app builds; webpack via DefinePlugin; esbuild via
 * `define`).  It must NOT be guarded with `typeof process`: in a browser
 * production build the bundler replaces `process.env.NODE_ENV` with
 * `"production"` but leaves `typeof process` alone, and since `process` does
 * not exist in the browser that guard would report *development*.  Instead
 * the read is wrapped in try/catch: where nothing defined or replaced it
 * (unbundled browser usage), the ReferenceError is caught and we treat the
 * environment as production — dev tooling stays off rather than throwing.
 *
 * `process` is declared locally rather than via `@types/node` so this module
 * type-checks in browser-only consumers.
 */

declare const process: { env: { NODE_ENV?: string } }

const _emitted = new Set<string>()

/**
 * True when `process.env.NODE_ENV` is readable and not `'production'`.
 * False in production builds and wherever `process` is undefined.
 */
export function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return false
  }
}

/**
 * Emit `console.warn('[byrding] ' + message)` once per distinct message.
 * No-op in production.
 */
export function devWarn(message: string): void {
  if (!isDev()) return
  if (_emitted.has(message)) return
  _emitted.add(message)
  console.warn(`[byrding] ${message}`)
}

/** @testonly Forget which messages have been emitted so a later `devWarn` fires again. */
export function resetDevWarnings(): void {
  _emitted.clear()
}
