/**
 * The declaration stamp of each container of the arena. A stamp is a
 * non-negative integer that changes when a declaration joins or leaves the
 * chain of its container, so a cache built at one stamp is stale at another.
 */
export class DeclarationStamps {
  /** @type {number[]} the stamp of each entry, 0 until its container is touched */
  #stamps = [];

  /** @type {number} the last stamp given, which only grows */
  #clock = 0;

  /** @type {number} the clock when the build settled the stamps; touches after it are unsettled */
  #settledAt = 0;

  /** Gives the next entry of the arena a stamp of 0. */
  grow() {
    this.#stamps.push(0);
  }

  /**
   * Gives the container a stamp greater than every earlier one.
   *
   * @param {number} container an index that the arena gave
   * @return {void}
   */
  touch(container) {
    this.#stamps[container] = ++this.#clock;
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {number} the stamp of the entry at `index`
   */
  stampOf(index) {
    return this.#stamps[index];
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {boolean} whether the declarations of the container changed after the build settled them
   */
  isTouched(index) {
    return this.#stamps[index] > this.#settledAt;
  }

  /** Marks every touch so far as the build's, so that only later touches count. */
  settle() {
    this.#settledAt = this.#clock;
  }
}

/** @typedef {Pick<DeclarationStamps, 'stampOf' | 'isTouched'>} DeclarationStampReader */
