import { StoreActions, StoreMethod } from './StoreActions';
import { StoreGetters } from './StoreGetters';

export type StoreDefinition<S, G, A> = {
  state: S;
  getters: StoreGetters<G, S>;
  actions: {
    [key in keyof A]: A[key] & ThisType<{ state: S } & A>;
  };
  init?: () => void;
};
