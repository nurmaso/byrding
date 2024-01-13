import { StoreActions } from './StoreActions';
import { StoreGetters } from './StoreGetters';

export type StoreDefinition<S, G, A> = {
  state: S & ThisType<S>;
  getters: StoreGetters<G, S>;
  actions: StoreActions<S, G, A>;
  init?: () => void;
};
