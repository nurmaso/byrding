import { _defineReactStore } from './defineReactStore';

export const defineReactStore = _defineReactStore;

/**
 * Store as an interface/plugin architecture
 * @Concept
 * - It should be possible to plugin a custom store `hook`
 * - We could define a default callback structure to expose the rootStore to be able to create an indipendent interface/plugin
 *   @definition [rootStore]: Is the single point of truth and keep all instances of a store in sync. This is required to support react change detection.
 * - (idea) we could enable class based stores which exist on global scope, so there is no strong need to clean up unmounted store instance
 *     !This would probably doesn't work with react functional components (but requires some research)
 * @version 0.0.3 (planned)
 */
export const defineStore = _defineReactStore;
