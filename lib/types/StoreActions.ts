import { StoreDefinition } from './StoreDefiniton';

export type StoreMethod<S, G, A> = (
  this: Partial<StoreDefinition<S, G, A>>,
  ...args: any[]
) => any;

export type StoreActions<S, G, A> = Record<keyof A, StoreMethod<S, G, A>>;
