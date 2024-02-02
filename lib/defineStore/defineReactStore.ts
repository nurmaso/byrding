import { useEffect, useReducer } from 'react';
import RootStore from '../rootStore';
import {
  DefineStoreResponse,
  StoreDefinition,
  UseStoreResponse,
} from '../types/StoreDefiniton';
import { SetupStoreClass, setupStore } from '../store';
import { defineActions } from './defineActions';
import { defineGetters } from './defineGetters';

export const _defineReactStore = <S, G, A>(
  name: string,
  context: StoreDefinition<S, G, A>
): DefineStoreResponse<S, G, A> => {
  context.init?.bind(context)();

  const useStore = (): UseStoreResponse<S, G, A> => {
    const [, setUpdateComponent] = useReducer((x) => x + 1, 0);

    const updateValues = () => {
      setUpdateComponent();
    };

    if (!RootStore.has(name)) {
      setupStore<S, G, A>(name, context);
    }

    const store = RootStore.get(name) as typeof SetupStoreClass &
      S &
      G &
      A &
      StoreDefinition<S, G, A>;

    const state = store.state;

    const getters = defineGetters(store.getters, state);

    useEffect(() => {
      const id = RootStore.mountHook(name, updateValues);

      return () => {
        RootStore.unmounHook(name, id);
      };
    }, []);

    const actions = defineActions(store.actions, store);

    return { state, getters, actions, store };
  };

  useStore.$id = name;

  return useStore;
};
