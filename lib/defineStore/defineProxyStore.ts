import {DefineStoreResponse, StoreDefinition} from "../types/StoreDefiniton.ts";
import RootStore from "../rootStore";
import {setupStore} from "../store.ts";
const watchMap= new Map<string, () => void>();
const handler = (onUpdate, name) => {
    return {
        get: function (obj, prop) {
            console.log(prop, obj[prop]);
            if(prop !== "getters" && prop !== "watch" && prop !== "init" && prop !== 'toJSON' ) {
                Object.defineProperty(obj[prop],'watch', (cb) => {
                    watchMap.set(name, cb);
                })
            }
           
            if (typeof obj[prop] === "object" && obj[prop] !== null) {
                return new Proxy(obj[prop], handler(onUpdate, name+'.'+prop));
            }
            return obj[prop];
        },
        set: function (obj, prop, value) {
            console.log('setting prop: ', prop, 'value: ', value);
            
            if (obj[prop] === value) return true;
            watchMap.get(name)?.(value,obj[prop]);

            obj[prop] = value;
            onUpdate && onUpdate();
            return true;
        },
        deleteProperty: function (obj, prop) {
            delete obj[prop];
            return true;
        },
    }
}

export const _defineProxyStore = <S, G, A>(
    name: string,
    context: StoreDefinition<S, G, A>,
    onUpdate?: () => void,
): DefineStoreResponse<S, G, A> => {

    if (!RootStore.has(name)) {
        setupStore<S, G, A>(name, new Proxy(context, handler(onUpdate)));
    }
    
    return RootStore.get(name);
};