import { defineProxyStore } from '../../../lib/defineStore';

export const useProxyStoreExample = defineProxyStore('proxyStore', {
  state: {
    name: 'Aarree',
    age: 29,
  },
  actions: {
    incAge() {
      console.log('state', this.age);
      this.age += 1;
    },
  },
});
