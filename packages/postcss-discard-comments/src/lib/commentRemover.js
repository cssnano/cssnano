
class CommentRemover {
  /** @type {boolean} */
  #hasFirst;

  /** @param {import('../index.js').Options} options */
  constructor(options) {
    this.options = options;
    this.#hasFirst = false;
  }
  /**
   * @param {string} comment
   * @return {boolean | undefined}
   */
  canRemove(comment) {
    const remove = this.options.remove;

    if (remove) {
      return remove(comment);
    } else {
      const isImportant = comment.indexOf('!') === 0;

      if (!isImportant) {
        return true;
      }

      if (this.options.removeAll || this.#hasFirst) {
        return true;
      } else if (this.options.removeAllButFirst && !this.#hasFirst) {
        this.#hasFirst = true;
        return false;
      }
    }
    return false;
  }
}
export default CommentRemover;
