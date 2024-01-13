import { StoreActions } from './types/StoreActions';
import { StoreDefinition } from './types/StoreDefiniton';
import { StoreState } from './types/StoreState';

export class StoreClass<
  N extends string,
  S extends StoreState,
  G extends object,
  A
> {
  state: S;
  getters: G;
  actions: StoreActions<S, G, A>;
  init?: () => void;
  name: string;
  updateCallback?: (state: S) => void;

  constructor(
    name: N,
    defintion: StoreDefinition<S, G, A>,
    updateCallback?: (state: S) => void
  ) {
    this.name = name;
    this.state = defintion.state;
    this.getters = defintion.getters;
    this.actions = defintion.actions;
    this.init = defintion.init;
    this.updateCallback = updateCallback;

    this.initState();
    this.initGetters();
    this.initActions();
  }

  initState() {
    Object.keys(this.state).forEach((value) => {
      Object.defineProperty(this, `${String(value)}`, {
        get() {
          return this.state[value];
        },
        set(val) {
          console.log('SETTER', val);
          this.state[value] = val;
          console.log('this.updateCallback', this.updateCallback, this.state);
          this.updateCallback?.(this);
        },
      });
    });
  }

  initGetters() {
    Object.keys(this.getters).forEach((value) => {
      Object.defineProperty(this, `${value}` as keyof G, {
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

// const StoreConstructorFunction = <N, S, G, A>function(this: )
export interface IConstructor<
  T extends object = object,
  TA extends unknown[] = unknown[]
> {
  new (...args: TA): T;
}

export const createStore = <
  N extends string,
  S extends StoreState,
  G extends object,
  A
>(
  name: N,
  context: StoreDefinition<S, G, A>,
  callback?: (store: S) => void
) => {
  return new StoreClass(
    name,
    context,
    callback
  ) as unknown as typeof StoreClass & S & G & A;
};
