import { SetupStoreClass } from '../store';
import { StoreActions } from './StoreActions';
import { StoreGetters } from './StoreGetters';
import { StoreState } from './StoreState';

export type StoreDefinition<S, G, A> = {
  state: StoreState<S>;
  getters?: StoreGetters<S, G>;
  actions: StoreActions<S, G, A>;
  init?: () => void;
};

export type UseStoreResponse<S, G, A> = Omit<
  Required<StoreDefinition<S, G, A>>,
  'init'
> & {
  store: typeof SetupStoreClass & S & A & G & StoreDefinition<S, G, A>;
};

export type DefineStoreResponse<S, G, A> = () => UseStoreResponse<S, G, A>;
