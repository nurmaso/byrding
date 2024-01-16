import { StoreDefinition } from './StoreDefiniton';

export type StoreActions<S, G, A> = A &
  // eslint-disable-next-line @typescript-eslint/ban-types
  Record<keyof A, Function> &
  ThisType<StoreDefinition<S, G, A> & A & S>;
