import { defineStore } from '../../lib/defineStore';

export const useTestStore = defineStore('TestStore', {
  state: {
    storeName: 'TestStore',
    counter: 0,
  },
  actions: {
    incCounter() {
      console.log('THIS', this);
      this.state.counter++;
    },
    test(a: string): string {
      console.log('A', a, this, 'nope');
      return 'hi';
    },
  },
  getters: {},
  init() {
    console.log('INIT', this.state);
    this.state.counter++;
  },
});
