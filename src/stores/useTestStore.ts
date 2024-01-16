import { defineStore } from '../../lib/defineStore';

export const useTestStore = defineStore('TestStore', {
  state: {
    storeName: 'TestStore',
    counter: 0,
    name: '',
    get getTestCounter() {
      return this.counter;
    },
    get getWithInput() {
      return (value: number) => this.counter > value;
    },
    get welcome() {
      return `hi ${this.name}`;
    },
  },
  actions: {
    incCounter() {
      this.counter++;
    },
    updateName(a: string) {
      this.name = a;
    },
  },
  getters: {
    getCounterDoubled(state): number {
      console.log('DOUBLE_COUNT', this, state);
      return state.counter * 2;
    },
    getDoubledMultiplied(state) {
      return (context: number): number => {
        console.log('Getter', state);
        return this.getCounterDoubled * context;
      };
    },
  },
  init() {
    console.log('INIT', this.state);
    this.state.counter++;
  },
});
