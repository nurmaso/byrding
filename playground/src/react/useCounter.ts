/**
 * React smoke-test — useCounter
 *
 * `defineStore` is called once at module load; the resulting hook can be used
 * in any number of React components.
 */
import { defineStore } from '@bocal/react';
import { COUNTER_ID, CounterStore } from '../shared/counterStore.js';

export const useCounter = defineStore(COUNTER_ID, CounterStore);
