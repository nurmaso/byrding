import { Hooks } from '../types/Hooks';

class RootStore {
  #stores = new Map();
  hooks: Hooks = {};

  handleUpdate(name: string, context: unknown) {
    if (!this.hooks[name]) return;
    for (const [, value] of Object.entries(this.hooks[name])) {
      value?.(context);
    }
  }

  assignStore({ name, store }: { name: string; store: unknown }) {
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
