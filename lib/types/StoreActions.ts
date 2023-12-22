import { StoreDefinition } from './StoreDefiniton';

export type StoreMethod<S, G, A> = (
  this: StoreDefinition<S, G, A>,
  ...args: any[]
) => any;

export type StoreActions<S, G, A> = { [key in keyof A]: StoreMethod<S, G, A> };
