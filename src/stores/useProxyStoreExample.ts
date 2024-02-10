import { defineProxyStore } from '../../lib/defineStore';

const useProxyStoreExample = defineProxyStore('proxyStore', {
  state: {
    name: 'Aarree',
    age: 29,
  },
  actions: {
    incAge() {
      this.age++;
    },
  },
});
