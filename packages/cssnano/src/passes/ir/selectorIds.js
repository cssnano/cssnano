/**
 * The selectors of one run, each with an integer id that its text gives on
 * first use. Two selectors have the same id exactly when their text is equal,
 * so comparing lists of selectors compares integers.
 */
export class SelectorIds {
  /** @type {Map<string, number>} */
  #ids = new Map();

  /**
   * @param {string} selector
   * @return {number} the id of the selector, given at its first use
   */
  idOf(selector) {
    let id = this.#ids.get(selector);
    if (id === undefined) {
      id = this.#ids.size;
      this.#ids.set(selector, id);
    }
    return id;
  }
}
