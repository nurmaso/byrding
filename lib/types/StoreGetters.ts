import { ReactNode } from 'react';

export type StoreGetters<G, S> = G &
  Record<
    keyof G,
    // eslint-disable-next-line @typescript-eslint/ban-types
    ((state: S) => Function) | ((state: S) => any)
  > &
  ThisType<G>;

// eslint-disable-next-line @typescript-eslint/ban-types
// export type StoreGetters<G, S> = ;

// type Test<G, S> = G & { [K: keyof G]: G[K] };
