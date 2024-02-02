import { Hooks } from '../types/Hooks';
import { generatorId } from '../utils/generatorId';

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

  mountHook(name: string, callback: (context: unknown) => void): number {
    const id = generatorId.next().value as number;

    if (!this.hooks[String(name)]) this.hooks[String(name)] = {};
    this.hooks[String(name)][id] = callback;

    return id;
  }

  unmounHook(name: string, id: number): void {
    delete this.hooks[String(name)][id];
  }
}

export default new RootStore();
