import {
  DefineStoreResponse,
  StoreDefinition,
} from '../types/StoreDefiniton.ts';
import RootStore from '../rootStore';
import { setupStore } from '../store.ts';
const watchMap = new Map<string, () => void>();
const handler = (name) => {
  return {
    get: function (obj, prop) {
      //   if (prop === 'watch' && typeof obj[prop] === 'function') {
      //     watchMap.set(name, obj[prop]);
      //   }
      console.log(obj, prop, obj[prop]);
      if (
        prop !== 'actions' &&
        typeof obj[prop] === 'object' &&
        typeof obj[prop] !== 'function' &&
        obj[prop] &&
        !obj[prop].watch
      ) {
        obj[prop].watch = (cb) => {
          console.log('set watch');
          watchMap.set(name + '.' + prop, cb);
          console.log('watchMap', watchMap);
        };

        console.log('moin', obj[prop]);

        return new Proxy(obj[prop], handler(name + '.' + prop));
      }
      return obj[prop];
    },
    set: function (obj, prop, value) {
      console.log('setting prop: ', prop, 'value: ', value);

      if (obj[prop] === value) return true;
      console.log('VALUE', value);
      watchMap.get(name)?.(value, obj[prop]);
      console.log(name, watchMap.get(name));

      obj[prop] = value;
      return true;
    },
    deleteProperty: function (obj, prop) {
      delete obj[prop];
      return true;
    },
  };
};

export const _defineProxyStore = <S, G, A>(
  name: string,
  context: StoreDefinition<S, G, A>
): DefineStoreResponse<S, G, A> => {
  if (!RootStore.has(name)) {
    setupStore<S, G, A>(name, new Proxy(context, handler(name)));
  }

  return RootStore.get(name);
};
