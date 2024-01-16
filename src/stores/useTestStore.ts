import { defineStore } from '../../lib/defineStore';

export const useTestStore = defineStore('TestStore', {
  state: {
    storeName: 'TestStore',
    counter: 0,
    get getTestCounter() {
      console.log('getTestCounter', this);
      return this.counter;
    },
    get getWithInput() {
      return (value: number) => this.counter > value;
    },
  },
  actions: {
    incCounter() {
      console.log('THIS', this);
      this.counter++;
    },
    test(a: string): string {
      console.log('A', a, this, 'nope');
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
        console.log('STATE', state);
        return this.getCounterDoubled * context;
      };
    },
  },
  init() {
    console.log('INIT', this.state);
    this.state.counter++;
  },
});
