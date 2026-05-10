// Types (consumed by framework adapters)
export type { StoreInstance, CoreStore, Plugin, PluginFactory } from './types.js'

// Classification
export { classify } from './classify.js'
export type { Classification } from './classify.js'

// Proxy-based reactivity
export { createReactiveState, normaliseKeyPath } from './proxy.js'

// Subscription map
export { subscribe, notify } from './subscriptions.js'

// Store registry
export { storeRegistry } from './registry.js'

// Core primitive — used by framework adapters only
export { createStore, generateComponentId } from './createStore.js'

// Plugin system
export { coreStore, configureByrding } from './coreStore.js'

// Devtools hook — consumed by framework adapters and the devtools panel
export { installDevtoolsHook, getDevtoolsHook } from './devtools-hook.js'
export type {
  ByrdingDevtoolsHook,
  DevtoolsEvent,
  DevtoolsStoreInit,
  DevtoolsStateChange,
  DevtoolsActionBefore,
  DevtoolsActionAfter,
  DevtoolsComponentMounted,
  DevtoolsComponentUnmounted,
  DevtoolsComponentRendered,
} from './devtools-hook.js'
