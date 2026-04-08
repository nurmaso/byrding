/**
 * Vanilla JS smoke-test — no framework needed.
 *
 * Uses @bocal/core directly to show that the store works outside any
 * framework context and that the factory-style definition works correctly.
 */
import { getOrCreateStore } from '@bocal/core';
import { COUNTER_FACTORY_ID, counterFactory } from '../shared/counterStore.js';

// Get (or create) the store entry.
const entry = getOrCreateStore(COUNTER_FACTORY_ID, counterFactory);
const store = entry.store;

// Subscribe to any change.
entry.subscribe(() => {
  console.log('[vanilla] store changed — count:', store.count, 'double:', store.double);
});

// Mutate via method (action).
console.log('[vanilla] initial count:', store.count);
store.increment();
store.increment();
console.log('[vanilla] after 2 increments — count:', store.count, '/ double:', store.double);

// Direct assignment (Proxy set trap fires automatically).
store.count = 10;
console.log('[vanilla] after direct assign count=10 — double:', store.double);

store.reset();
console.log('[vanilla] after reset — count:', store.count);
