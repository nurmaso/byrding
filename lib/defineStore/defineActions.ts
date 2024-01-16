import { StoreActions } from '../types/StoreActions';
import { StoreDefinition } from '../types/StoreDefiniton';

export const defineActions = <A, S, G>(
  actions: StoreActions<S, G, A>,
  context: StoreDefinition<S, G, A>
): StoreActions<S, G, A> => {
  const result = {} as StoreActions<S, G, A>;

  for (const action in actions) {
    Object.assign(result, {
      [action]: (...args: unknown[]) => {
        actions[action].bind(context)(...args);
      },
    });
  }

  return result;
};
