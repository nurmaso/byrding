import { useEffect, useReducer, useState } from 'react';
import rootStore from '../rootStore';
import { StoreDefinition } from '../types/StoreDefiniton';
import { StoreActions } from '../types/StoreActions';
import { StoreGetters } from '../types/StoreGetters';

function* componentIdGen() {
  let index = 1;
  while (true) yield index++;
}

const idGen = componentIdGen();

const stateReducer = <S, G, A>(
  state: S,
  context: StoreDefinition<S, G, A>
) => ({ ...state, ...context });

const initGetters = <S, G extends object>(storeGetters: G, state: S) => {
  if (!storeGetters) return {} as StoreGetters<G, S>;
  const result = {} as StoreGetters<G, S>;
  for (const [key, getter] of Object.entries(storeGetters)) {
    Object.assign(result, {
      [key]: (context: unknown) => getter({ state, getters: result }, context),
    });

    Object.assign(result, {
      [key]: getter({ state, getters: result }),
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
        // actions[action](...args);
        if (
          context.state &&
          JSON.stringify(context.state) !== JSON.stringify(rootStore.get(name))
        ) {
          rootStore.handleUpdate<S>(name, context.state);
        }
      },
    });
  }
  return result;
};

export const defineStore = <N, S, G, A>(
  name: N | string | symbol,
  context: StoreDefinition<S, G, A>
  // ) => {
): (() => StoreDefinition<S, G, A> & { setValue: () => void }) => {
  console.log('Name', name);
  context.init?.bind(context)();
  const useStore = (): StoreDefinition<S, G, A> & { setValue: () => void } => {
    if (!rootStore.has(name)) {
      rootStore.assignStore({ name, store: context });
    }

    const store = rootStore.get(name);

    const [state, setState] = useReducer<
      (state: S, context: StoreDefinition<S, G, A>) => S
    >(stateReducer, store.state);
    const [getters, setGetters] = useState(initGetters(store.getters, state));
    const updateValues = () => {
      console.log('CALLEd', rootStore.get(name), state);
      // setState(context);
      setState(rootStore.get(name).state);
      setGetters(initGetters(store.getters, rootStore.get(name).state));
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

    return { state, getters, actions, setValue: updateValues };
  };
  useStore.$id = name;
  return useStore;
};
