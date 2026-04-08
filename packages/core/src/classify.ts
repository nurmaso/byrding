/**
 * classify.ts
 *
 * Inspects an instantiated store object and buckets every key into one of
 * three categories: state, action, or computed.
 *
 * Rules (applied in order):
 *   1. An ES `get` accessor  → computed
 *   2. A plain function value → action
 *   3. Anything else          → state
 *
 * The inspection covers both **own properties** (closure objects and class
 * fields) and the **prototype chain** (class methods and prototype getters).
 * Closure objects have `Object.prototype` as their prototype, so the prototype
 * walk is a harmless no-op for that style.
 *
 * NOTE: `Object.getOwnPropertyDescriptors` is used deliberately — reading the
 * live value of a property would invoke ES getters and return their *return
 * type*, hiding the fact that they are accessors.
 */

export interface Classification {
  stateKeys: string[]
  actionKeys: string[]
  computedKeys: string[]
}

export function classify(instance: object): Classification {
  const stateKeys: string[] = []
  const actionKeys: string[] = []
  const computedKeys: string[] = []

  // ── Own properties ───────────────────────────────────────────────────────
  // Class fields and closure object properties both land here.
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(instance),
  )) {
    if (typeof descriptor.get === 'function') {
      computedKeys.push(key)
    } else if (typeof descriptor.value === 'function') {
      actionKeys.push(key)
    } else {
      stateKeys.push(key)
    }
  }

  // ── Prototype chain ──────────────────────────────────────────────────────
  // Class methods and prototype getters live here.
  // Closure objects have Object.prototype → skipped.
  const proto = Object.getPrototypeOf(instance)
  if (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue
      const descriptor = Object.getOwnPropertyDescriptor(proto, key)!
      if (typeof descriptor.get === 'function') {
        computedKeys.push(key)
      } else if (typeof descriptor.value === 'function') {
        actionKeys.push(key)
      }
    }
  }

  return { stateKeys, actionKeys, computedKeys }
}
