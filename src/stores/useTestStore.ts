import { defineStore } from '../../lib/defineStore';

export const useTestStore = defineStore(Symbol('TestStore'), {
  state: {
    storeName: 'TestStore',
    counter: 0,
  },
  actions: {
    incCounter() {
      this.state.counter++;
    },
    test(a: string) {
      console.log('A', a);
    },
  },
  init() {
    console.log('INIT', this.state);
    this.state.counter++;
  },
});
