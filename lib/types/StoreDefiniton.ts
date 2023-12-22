import { StoreActions } from './StoreActions';
import { StoreGetters } from './StoreGetters';

export interface StoreDefinition<S, G, A> {
  state: S;
  getters?: StoreGetters<G, S>;
  actions?: StoreActions<S, G, A>;
  init?: () => void;
}
