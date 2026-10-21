/**
 * Finds the earliest position whose key a later position repeats. Recording
 * writes is the costly part of a join, so it starts there, and is skipped
 * where no key repeats.
 */
export default class RepeatScan {
  /** @type {Map<unknown, number>} */
  #firstIndex = new Map();
  start = Infinity;

  /**
   * @param {unknown} key
   * @param {number} position
   */
  see(key, position) {
    const first = this.#firstIndex.get(key);
    if (first === undefined) this.#firstIndex.set(key, position);
    else if (first < this.start) this.start = first;
  }
}
