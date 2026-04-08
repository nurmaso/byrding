/**
 * classify.ts
 *
 * Normalises a store definition into a plain object instance, supporting two
 * authoring styles:
 *
 *   1. Class  — `defineStore('id', MyStore)` where `MyStore` is a class.
 *      `new MyStore()` is called; own properties AND the full prototype chain
 *      (methods, accessors) are preserved on the resulting instance.
 *
 *   2. Closure factory — `defineStore('id', myFactory)` where `myFactory` is
 *      a plain function (not a class constructor).  The function is called with
 *      no arguments and must return a plain object.
 */

export type ClassDef<T extends object> = new () => T;
export type FactoryDef<T extends object> = () => T;
export type StoreDef<T extends object> = ClassDef<T> | FactoryDef<T>;

/**
 * Returns `true` when `fn` looks like an ES6 class (its stringified source
 * starts with the `class` keyword).  Regular functions and arrow functions
 * return `false`.
 */
function isClass(fn: unknown): fn is ClassDef<object> {
  if (typeof fn !== 'function') return false;
  // ES6 classes always start with "class" in their toString()
  return /^\s*class[\s{]/.test(Function.prototype.toString.call(fn));
}

/**
 * Instantiates the store definition and returns the resulting object.
 *
 * For **class** definitions the instance is returned as-is so that its
 * prototype chain (getters, methods) stays intact for the Proxy to intercept.
 *
 * For **factory** definitions the returned object is used directly.
 */
export function classify<T extends object>(definition: StoreDef<T>): T {
  if (isClass(definition)) {
    return new (definition as ClassDef<T>)();
  }
  return (definition as FactoryDef<T>)();
}
