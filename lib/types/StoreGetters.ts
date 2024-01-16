type StoreGettersThis<G> = ThisType<
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly [k in keyof G]: G[k] extends (...args: any[]) => infer R
      ? R
      : G[k];
  } & G
>;

export type StoreGetters<S, G> = G &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, (state: S) => any | (() => any)> &
  StoreGettersThis<G>;
