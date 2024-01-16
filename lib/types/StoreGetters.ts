type StoreGettersThis<G> = ThisType<
  {
    readonly [k in keyof G]: G[k] extends (...args: any[]) => infer R
      ? R
      : G[k];
  } & G
>;

export type StoreGetters<S, G> = G &
  Record<string, (state: S) => any | (() => any)> &
  StoreGettersThis<G>;
