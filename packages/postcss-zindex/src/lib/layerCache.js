'use strict';
class LayerCache {
  /** @constructor */
  constructor() {
    this._values = new Map();
  }

  /**
   * @param {number} startIndex
   * @return {void}
   */
  optimizeValues(startIndex) {
    const sortedValues = Array.from(this._values.keys()).sort(ascending);
    for (let i = 0; i < sortedValues.length; i++) {
      this._values.set(sortedValues[i], i + startIndex);
    }
  }

  /**
   * @param {string} value
   * @return {void}
   */
  addValue(value) {
    let parsedValue = parseInt(value, 10);

    // pass only valid values
    if (!parsedValue || parsedValue < 0) {
      return;
    }

    this._values.set(parsedValue, parsedValue);
  }

  /**
   * @param {string} value
   * @return {string}
   */
  getValue(value) {
    let parsedValue = parseInt(value, 10);

    return this._values.get(parsedValue) || value;
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

module.exports = LayerCache;
