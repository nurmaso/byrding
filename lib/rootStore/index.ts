type Hooks = {
  [key: string]: {
    [key: number | string]: (context?: any) => void;
  };
};

// type StoreStateMap<N, S> = {
//   [key of N]: {}
// }

class RootStore {
  #stores = new Map();
  hooks: Hooks = {};

  // #storeState = {};

  handleUpdate(name: string, context: any) {
    console.log('handleUpdate', this.hooks, name);
    if (!this.hooks[name]) return;
    for (const [, value] of Object.entries(this.hooks[name])) {
      value?.(context);
    }
  }

  assignStore({ name, store }: { name: string; store: any }) {
    this.#stores.set(name, store);
  }

  has(name: string) {
    return this.#stores.has(name);
  }
  get(name: string) {
    return this.#stores.get(name);
  }
}

export default new RootStore();
