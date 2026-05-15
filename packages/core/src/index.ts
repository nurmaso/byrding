// Types (consumed by framework adapters)
export type { StoreInstance, StoreHandle, StateOf, ActionsOf, MergedStore, Plugin, PluginFactory } from './types.js'

// Classification
export { classify } from './classify.js'
export type { Classification } from './classify.js'

// Proxy-based reactivity
export { createReactiveState, normaliseKeyPath } from './proxy.js'

// Subscription map
export { subscribe, notify } from './subscriptions.js'

// Store registry
export { storeRegistry, resetRegistry } from './registry.js'

// Plugin system — global CoreStore singleton and configuration
export { CoreStore, coreStore, configureByrding } from './coreStore.js'

// Core primitive — used by framework adapters only
export { createStore, generateComponentId } from './createStore.js'

// State watcher — vanilla-JS utility for observing individual state keys
export { watchState } from './watch.js'
export type { StateWatcher } from './watch.js'

// Devtools plugin — opt-in; tree-shaken when not registered
export { devtoolsPlugin, installDevtoolsHook, getDevtoolsHook } from './devtoolsPlugin.js'
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
} from './devtoolsPlugin.js'
