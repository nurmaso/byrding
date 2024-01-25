import { defineReactStore } from '../../lib/defineStore';

export const useTestStore = defineReactStore('TestStore', {
  state: {
    storeName: 'TestStore',
    counter: 0,
    name: '',
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
    updateName(value: string) {
      this.name = value;
    },
  },
  getters: {},
  init() {
    console.log('INIT', this.state);
    this.state.counter++;
  },
});
