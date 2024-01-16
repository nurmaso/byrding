import { defineStore } from '../../lib/defineStore';

export const useTestStore = defineStore('TestStore', {
  state: {
    storeName: 'TestStore',
    counter: 0,
    get getTestCounter() {
      return this.counter;
    },
    get getWithInput() {
      return (value: number) => this.counter > value;
    },
  },
  actions: {
    incCounter() {
      this.counter++;
    },
    test(a: string): string {
      return 'hi';
    },
  },
  getters: {
    getCounterDoubled(state): number {
      console.log('DOUBLE_COUNT', this, state);
      return state.counter * 2;
    },
    getDoubledMultiplied(state) {
      return (context: number): number => {
        return this.getCounterDoubled * context;
      };
    },
  },
  init() {
    console.log('INIT', this.state);
    this.state.counter++;
  },
});
