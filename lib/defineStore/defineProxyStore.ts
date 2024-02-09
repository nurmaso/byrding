import {DefineStoreResponse, StoreDefinition} from "../types/StoreDefiniton.ts";
import RootStore from "../rootStore";
import {setupStore, SetupStoreClass} from "../store.ts";

const handler = (onUpdate, name) => {
    return {
        get: function (obj, prop) {
            if (typeof obj[prop] === "object" && obj[prop] !== null) {
                return new Proxy(obj[prop], handler(onUpdate));
            }
            return obj[prop];
        },
        set: function (obj, prop, value) {
            console.log('setting prop: ', prop, 'value: ', value);
            if (obj[prop] === value) return true;
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