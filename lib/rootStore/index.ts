import { StoreDefinition } from '../types/StoreDefiniton';

type Hooks<S> = {
  [key: string]: {
    [key: number | string]: (context?: Partial<S>) => void;
  };
};

class RootStore<N, S, G, A> {
  #stores = new Map();
  hooks: Hooks<S> = {};

  handleUpdate<T extends S>(name: string, context: Partial<T>) {
    console.log(this.hooks, name);
    for (const [, value] of Object.entries(this.hooks[name])) {
      value?.(context);
    }
  }

  assignStore({
    name,
    store,
  }: {
    name: string | N;
    store: StoreDefinition<S, G, A>;
  }) {
    this.#stores.set(name, store);
  }

  has(name: string | N) {
    return this.#stores.has(name);
  }
  get(name: string | N) {
    return this.#stores.get(name);
  }
}

export default new RootStore();
