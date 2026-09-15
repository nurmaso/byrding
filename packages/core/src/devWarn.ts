/**
 * devWarn.ts
 *
 * Development-only diagnostics.  Every warning is prefixed with `[byrding]`,
 * emitted at most once per distinct message, and compiled out of production
 * builds: `isDev()` reads `process.env.NODE_ENV` in a form bundlers can
 * statically replace, so a `NODE_ENV=production` build turns each call site
 * into dead code.
 *
 * `process` is declared locally rather than via `@types/node` so this module
 * type-checks in browser-only consumers; the `typeof` guard keeps it from
 * throwing where `process` is not defined at runtime.
 */

declare const process: { env?: { NODE_ENV?: string } } | undefined

const _emitted = new Set<string>()

/** True unless `process.env.NODE_ENV === 'production'`. */
export function isDev(): boolean {
  return (
    typeof process === 'undefined' ||
    process.env == null ||
    process.env.NODE_ENV !== 'production'
  )
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
