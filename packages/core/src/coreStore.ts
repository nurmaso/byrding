import type { Plugin } from './types.js'

export class CoreStore {
  private _plugins: Plugin[] = []
  private _initialized = false

  constructor({ plugins = [] }: { plugins?: Plugin[] } = {}) {
    for (const p of plugins) this._plugins.push(p)
  }

  get initialized(): boolean {
    return this._initialized
  }

  use(plugin: Plugin): void {
    this._plugins.push(plugin)
  }

  markInitialized(): void {
    this._initialized = true
  }

  runOnInit(storeId: string, snapshot: Record<string, unknown>): void {
    for (const p of this._plugins) p.onInit?.(storeId, snapshot)
  }

  runOnStateChange(storeId: string, path: string, next: unknown, prev: unknown): void {
    for (const p of this._plugins) p.onStateChange?.(storeId, path, next, prev)
  }

  runOnAction(storeId: string, actionName: string, args: unknown[]): void {
    for (const p of this._plugins) p.onAction?.(storeId, actionName, args)
  }

  runOnDispose(storeId: string): void {
    for (const p of this._plugins) p.onDispose?.(storeId)
  }
}

export const coreStore = new CoreStore()

export function configureByrding({ plugins }: { plugins: Plugin[] }): void {
  if (coreStore.initialized) {
    throw new Error('configureByrding must be called before any store is created')
  }
  for (const p of plugins) coreStore.use(p)
}
