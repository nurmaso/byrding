export const toggleId = 'toggle'

export const toggleDefinition = () => {
  const store = {
    isActive: false,
    clickCount: 0,

    get label(): string {
      return store.isActive ? 'ON' : 'OFF'
    },

    // Chained computed — calls store.label, which itself is a computed getter.
    get status(): string {
      return `${store.label} (toggled ${store.clickCount}x)`
    },

    toggle() {
      store.isActive = !store.isActive
      store.clickCount++
    },
  }
  return store
}
