import { StoreActions } from './StoreActions';
import { StoreGetters } from './StoreGetters';
import { StoreState } from './StoreState';

export type StoreDefinition<S, G, A> = {
  state: StoreState<S>;
  getters?: StoreGetters<S, G>;
  actions: StoreActions<S, G, A>;
  init?: () => void;
};
