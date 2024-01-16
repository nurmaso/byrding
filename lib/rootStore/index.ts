type Hooks = {
  [key: string]: {
    [key: number | string]: (context?: any) => void;
  };
};

class RootStore {
  #stores = new Map();
  hooks: Hooks = {};

  handleUpdate(name: string, context: any) {
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
