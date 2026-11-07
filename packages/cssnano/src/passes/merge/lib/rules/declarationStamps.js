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
}

/** @typedef {Pick<DeclarationStamps, 'stampOf'>} DeclarationStampReader */
