import { useEffect, useReducer, useCallback } from 'react';
import rootStore from '../rootStore';
import {
  DefineStoreResponse,
  StoreDefinition,
  UseStoreResponse,
} from '../types/StoreDefiniton';
import { StoreClass, createStore } from '../store';
import { defineActions } from './defineActions';
import { defineGetters } from './defineGetters';
import { generatorId } from '../utils/generatorId';

export const _defineReactStore = <S, G, A>(
  name: string,
  context: StoreDefinition<S, G, A>
): DefineStoreResponse<S, G, A> => {
  context.init?.bind(context)();

  const useStore = (): UseStoreResponse<S, G, A> => {
    const [, setUpdateComponent] = useReducer((x) => x + 1, 0);

    const callback = useCallback((s: S) => {
      rootStore.handleUpdate(name, s);
    }, []);

    if (!rootStore.has(name)) {
      const store = createStore<S, G, A>(context, callback);
      rootStore.assignStore({ name, store });
    }

    const store = rootStore.get(name) as typeof StoreClass &
      S &
      G &
      A &
      StoreDefinition<S, G, A>;

    const state = store.state;

    const getters = defineGetters(store.getters, state);

    const updateValues = () => {
      setUpdateComponent();
    };

    useEffect(() => {
      const id = generatorId.next().value as number;

      if (!rootStore.hooks[String(name)]) rootStore.hooks[String(name)] = {};
      rootStore.hooks[String(name)][id] = updateValues;

      return () => {
        delete rootStore.hooks[String(name)][id];
      };
    }, []);

    const actions = defineActions(store.actions, store);

    return { state, getters, actions, store };
  };

  useStore.$id = name;

  return useStore;
};
