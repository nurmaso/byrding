/**
 * registry.ts
 *
 * Module-level singleton map.  All packages that import `@byrding/core` share
 * the same registry instance because Node (and bundlers) resolve a module
 * only once.  This is what makes cross-framework store sharing possible.
 */
import type { StoreInstance } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const storeRegistry = new Map<string, StoreInstance<any, any>>();
