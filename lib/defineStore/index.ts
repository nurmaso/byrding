import { useEffect, useReducer, useState, useCallback } from 'react';
import rootStore from '../rootStore';
import { StoreDefinition } from '../types/StoreDefiniton';
import { StoreActions } from '../types/StoreActions';
import { StoreGetters } from '../types/StoreGetters';
import { StoreClass, createStore } from '../store';

function* componentIdGen() {
  let index = 1;
  while (true) yield index++;
}

const idGen = componentIdGen();

const initGetters = <S, G>(
  storeGetters: StoreGetters<S, G> = {} as StoreGetters<S, G>,
  state: S & ThisType<S>
): StoreGetters<S, G> => {
  const result = {} as StoreGetters<S, G>;

  for (const getter in storeGetters) {
    Object.assign(result, {
      [getter]: (function () {
        const res = storeGetters[getter].bind(result)(state);
        if (typeof res === 'function') res.bind(storeGetters);
        return res;
      })(),
    });
  }

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
        if (
          context.state &&
          JSON.stringify(context.state) !== JSON.stringify(rootStore.get(name))
        ) {
          rootStore.handleUpdate(name, context);
        }
      },
    });
  }
  return result;
};

export type UseStoreResponse<S, G, A> = Omit<
  Required<StoreDefinition<S, G, A>>,
  'init'
> & {
  setValue: () => void;
  store: typeof StoreClass & S & A & G & StoreDefinition<S, G, A>;
};

export type DefineStoreResponse<S, G, A> = () => UseStoreResponse<S, G, A>;

export const defineStore = <S, G, A>(
  name: string,
  context: StoreDefinition<S, G, A>
  // ) => {
): DefineStoreResponse<S, G, A> => {
  context.init?.bind(context)();
  const useStore = (): UseStoreResponse<S, G, A> => {
    const [, setUpdateComponent] = useReducer((x) => x + 1, 0);

    const callback = useCallback((s: S) => {
      rootStore.handleUpdate(name, s);
    }, []);

    if (!rootStore.has(name)) {
      const store = createStore<S, G, A>(name, context, callback);
      rootStore.assignStore({ name: name, store });
    }

    const store = rootStore.get(name) as typeof StoreClass &
      S &
      G &
      A &
      StoreDefinition<S, G, A>;
    const state = store.state;
    const getters = initGetters(store.getters, state);

    const updateValues = () => {
      setUpdateComponent();
    };

    useEffect(() => {
      const id = idGen.next().value as number;
      if (!rootStore.hooks[String(name)]) rootStore.hooks[String(name)] = {};

      rootStore.hooks[String(name)][id] = updateValues;
      return () => {
        delete rootStore.hooks[String(name)][id];
      };
    }, []);
    const actions = useActions(String(name), store.actions, context);

    return { state, getters, actions, setValue: updateValues, store };
  };
  useStore.$id = name;
  return useStore;
};
