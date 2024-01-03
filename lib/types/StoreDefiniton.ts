import { StoreActions, StoreMethod } from './StoreActions';
import { StoreGetters } from './StoreGetters';

export type StoreDefinition<S, G, A> = {
  state: S;
  getters?: StoreGetters<G, S>;
  actions: A & ThisType<StoreDefinition<S, G, A>>;
  init?: () => void;
};
