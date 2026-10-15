/** @constructor */
class LayerCache {
  #values;
  constructor() {
    this.#values = new Map();
  }
  /**
   * @param {number} startIndex
   * @return {void}
   */
  optimizeValues(startIndex) {
    const sortedValues = Array.from(this.#values.keys()).toSorted(ascending);
    for (let i = 0; i < sortedValues.length; i++) {
      this.#values.set(sortedValues[i], i + startIndex);
    }
  }
  /**
   * @param {string} value
   * @return {void}
   */
  addValue(value) {
    const parsedValue = Number.parseInt(value, 10);

    // pass only valid values
    if (!parsedValue || parsedValue < 0) {
      return;
    }

    this.#values.set(parsedValue, parsedValue);
  }
  /**
   * @param {string} value
   * @return {string}
   */
  getValue(value) {
    const parsedValue = Number.parseInt(value, 10);

    return this.#values.get(parsedValue) || value;
  }
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function ascending(a, b) {
  return a - b;
}
export default LayerCache;
