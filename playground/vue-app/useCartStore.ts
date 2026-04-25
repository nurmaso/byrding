/**
 * vue-app/useCartStore.ts
 *
 * Vue 3 composable for the shared cart store.
 * Same `cartId` + `CartStore` as the React app — both connect to the singleton.
 *
 * Adding an item from a React component will re-render Vue components that
 * read `store.items` or `store.totalItems`, and vice versa.
 */
import { defineStore } from '@byrding/vue'
import { cartId, CartStore } from '../shared/cart.store.js'

export const useCartStore = defineStore(cartId, CartStore)
