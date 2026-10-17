/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>} whether the value is a plain
 * object: an object literal (from any realm) or one with no prototype, not an
 * array, a Map, a Date or an instance of a class
 */
export default function isRecord(value) {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  // Object.prototype differs per realm, so test its place in the chain instead.
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
