export type StoreGetters<G, S> = Partial<
  Record<
    keyof G,
    | (({ state }: { state: S }) => string | number)
    | (() => string | number)
    | null
  >
>;
