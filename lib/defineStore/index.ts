import { useEffect, useReducer, useState, useCallback } from 'react';
import rootStore from '../rootStore';
import { StoreDefinition } from '../types/StoreDefiniton';
import { StoreActions } from '../types/StoreActions';
import { StoreGetters } from '../types/StoreGetters';
import {
  ClassWithMixin,
  Store,
  StoreClass,
  StoreType,
  createStore,
} from '../store';
import { StoreState } from '../types/StoreState';

function* componentIdGen() {
  let index = 1;
  while (true) yield index++;
}

const idGen = componentIdGen();

const stateReducer = <S, G, A>(
  state: S & ThisType<S>,
  context: S
): S & ThisType<S> => {
  console.log('UPS');
  return { ...state, ...context };
};

const initGetters = <S, G>(
  storeGetters: StoreGetters<G, S>,
  state: S
): StoreGetters<G, S> => {
  // if (!storeGetters) return {} as StoreGetters<G, S>;
  // console.log('STORE GETTERS', this);
  const result = {} as StoreGetters<G, S>;

  for (const getter in storeGetters) {
    // Object.assign(result, {
    //   [getter]:
    // })
    // Object.assign(result, {
    //   [getter]: (context: any) =>
    //     storeGetters[getter]({ state, getters: result }, context).bind(
    //       storeGetters
    //     ),
    // });
    // console.log('>>>>>>>', getter);
    // Object.assign(result, {
    //   [getter]: storeGetters[getter].call(result, { state, getters: result }),
    // });
    Object.assign(result, {
      [getter]: (function () {
        const res = storeGetters[getter].bind(result)({
          state,
          getters: result,
        });
        // console.log('RES', res);
        if (typeof res === 'function') res.bind(storeGetters);
        return res;
      })(),
    });
  }

  // for (const getter in result) {
  //   result[getter].bind(result);
  // }

  // for (const [key, getter] of Object.entries(storeGetters)) {
  //   Object.assign(result, {
  //     [key]: (context: unknown) => getter({ state, getters: result }, context),
  //   });

  //   Object.assign(result, {
  //     [key]: getter({ state, getters: result }),
  //   });
  // }

  return result;
};

const useActions = <A, S, G>(
  name: string,
  actions: StoreActions<S, G, A>,
  context: StoreDefinition<S, G, A>
): StoreActions<S, G, A> => {
  const result = {} as StoreActions<S, G, A>;
  for (const action in actions) {
    Object.assign(result, {
      [action]: (...args: any[]) => {
        console.log('CONTEXT', context.state);
        actions[action].bind(context)(...args);
        // actions[action](...args);
        if (
          context.state &&
          JSON.stringify(context.state) !== JSON.stringify(rootStore.get(name))
        ) {
          rootStore.handleUpdate<S>(name, context);
        }
      },
    });
  }
  return result;
};

export const defineStore = <
  N extends string,
  S extends StoreState,
  G extends object,
  A
>(
  name: N,
  context: StoreDefinition<S, G, A>
  // ) => {
): (() => StoreDefinition<S, G, A> & {
  setValue: () => void;
  testStore: S & StoreGetters<G, S> & A;
}) => {
  console.log('Name', name);
  // context.getters = context.getters || {};
  context.init?.bind(context)();
  const useStore = (): StoreDefinition<S, G, A> & {
    setValue: () => void;
  } & { testStore: typeof StoreClass & S & G & A } => {
    const [state, setState] = useReducer<
      (state: S & ThisType<S>, context: S) => S & ThisType<S>
    >(stateReducer, {} as S);
    console.log('state', state);

    const callback = useCallback((s: S) => {
      console.log('>>> CALLBACK', s, state);
      // setState(s);
      console.log('-- STATE', s, state);
      rootStore.handleUpdate<S>(`test_${name}`, s);
      // console.log('TEST_STORE', testStore, testStore.name);
      // console.log('GETTERS', testStore.getCounterDoubled);
      // console.log('GETTERS', testStore.getDoubledMultiplied(3));
    }, []);
    if (!rootStore.has(`test_${name}`)) {
      console.log('MOIN');
      const testStore = createStore<N, S, G, A>(name, context, callback);
      // const state = testStore;

      testStore.storeName = 'New Name';
      console.log('NEW TEST_STORE', testStore.storeName);
      console.log('ACTIONS', testStore.incCounter());
      rootStore.assignStore({ name: `test_${name}`, store: testStore });
    }
    if (!rootStore.has(name)) {
      // const testStore = new Store(name, context, callback);

      rootStore.assignStore({ name, store: context });
    }

    const store = rootStore.get(name) as StoreDefinition<S, G, A>;
    const testStore = rootStore.get(`test_${name}`) as StoreDefinition<S, G, A>;

    // console.log('>>>>>>>>THIS', this, window);
    // const [getters, setGetters] = useState(initGetters(store.getters, state));
    const getters = initGetters(store.getters, state);

    const updateValues = () => {
      console.log('CALLED');
      // setState(context);
      setState(rootStore.get(name).state);
      setState(rootStore.get(`test_${name}`).state);
      // setGetters(initGetters(store.getters, rootStore.get(name).state as S));
    };

    useEffect(() => {
      const id = idGen.next().value as number;
      if (!rootStore.hooks[String(name)]) rootStore.hooks[String(name)] = {};
      if (!rootStore.hooks[String(`test_${name}`)])
        rootStore.hooks[String(`test_${name}`)] = {};
      rootStore.hooks[String(name)][id] = updateValues;
      rootStore.hooks[String(`test_${name}`)][id] = updateValues;
      return () => {
        delete rootStore.hooks[String(name)][id];
        delete rootStore.hooks[String(`test_${name}`)][id];
      };
    }, []);
    const actions = useActions(String(name), store.actions, context);

    return { state, getters, actions, setValue: updateValues, testStore };
  };
  useStore.$id = name;
  return useStore;
};
