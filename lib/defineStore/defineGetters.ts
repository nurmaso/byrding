import { StoreGetters } from '../types/StoreGetters';

export const defineGetters = <S, G>(
  storeGetters: StoreGetters<S, G> = {} as StoreGetters<S, G>,
  state: S & ThisType<S>
): StoreGetters<S, G> => {
  const result = {} as StoreGetters<S, G>;

  for (const getter in storeGetters) {
    Object.assign(result, {
      [getter]: (function () {
        const res = storeGetters[getter].bind(result)(state);
        if (typeof res === 'function') res.bind(storeGetters);
        return res;
      })(),
    });
  }

  return result;
};
