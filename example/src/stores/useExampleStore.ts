import { defineStore } from '@nurmaso/store';

export const useExampleStore = defineStore('example', {
  state: {
    count: 0,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});
