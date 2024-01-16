import { StoreActions } from './types/StoreActions';
import { StoreDefinition } from './types/StoreDefiniton';

export class StoreClass<S, G, A> {
  state: S;
  getters: G;
  actions: StoreActions<S, G, A>;
  init?: () => void;
  updateCallback?: (state: S) => void;

  constructor(
    defintion: StoreDefinition<S, G, A>,
    updateCallback?: (state: S) => void
  ) {
    this.state = defintion.state;
    this.getters = defintion.getters || ({} as G);
    this.actions = defintion.actions;
    this.init = defintion.init;
    this.updateCallback = updateCallback;

    this.initState();
    this.initGetters();
    this.initActions();
  }

  initState() {
    Object.keys(this.state || {}).forEach((value) => {
      Object.defineProperty(this, `${String(value)}`, {
        get() {
          return this.state[value];
        },
        set(val) {
          this.state[value] = val;
          this.updateCallback?.(this);
        },
      });
    });
  }

  initGetters() {
    Object.keys(this.getters || {}).forEach((value) => {
      Object.defineProperty(this, value as keyof G, {
        get() {
          return this.getters[value].bind(this)(this.state);
        },
      });
    });
  }

  initActions() {
    const keys = Object.keys(this.actions) as Array<
      keyof StoreActions<S, G, A>
    >;
    keys.forEach((value) => {
      Object.defineProperty(this, `${String(value)}`, {
        value: (...args: any[]) => {
          return this.actions[value].bind(this)(...args);
        },
      });
    });
  }
}

export interface IConstructor<
  T extends object = object,
  TA extends unknown[] = unknown[]
> {
  new (...args: TA): T;
}

export const createStore = <S, G, A>(
  context: StoreDefinition<S, G, A>,
  callback?: (store: S) => void
) => {
  return new StoreClass(context, callback) as unknown as typeof StoreClass &
    S &
    G &
    A &
    StoreDefinition<S, G, A>;
};
