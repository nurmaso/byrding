/**
 * Vue 3 smoke-test — useCounter
 *
 * Same store id and definition as the React side — both share the same
 * singleton from @bocal/core's registry.
 */
import { defineStore } from '@bocal/vue';
import { COUNTER_ID, CounterStore } from '../shared/counterStore.js';

export const useCounter = defineStore(COUNTER_ID, CounterStore);
