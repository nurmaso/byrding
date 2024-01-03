export type StoreGetters<G, S> = Record<
  keyof G,
  | (({ state }: { state: S }) => string | number)
  | (() => string | number)
  | null
>;
