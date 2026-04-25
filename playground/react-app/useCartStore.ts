/**
 * react-app/useCartStore.ts
 *
 * React hook for the shared cart store.
 * Same `cartId` + `CartStore` as the Vue app — both connect to the singleton.
 */
import { defineStore } from '@byrding/react'
import { cartId, CartStore } from '../shared/cart.store.js'

export const useCartStore = defineStore(cartId, CartStore)
