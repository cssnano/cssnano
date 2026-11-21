import cssnanoUtils from '#utils';

const { isImportantComment } = cssnanoUtils;

class CommentRemover {
  /** @param {import('../index.js').Options} options */
  constructor(options) {
    if (options.remove !== undefined && typeof options.remove !== 'function') {
      throw new TypeError('The remove option must be a function or undefined.');
    }

    this.options = options;
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
      return !isImportantComment(comment) || Boolean(this.options.removeAll);
    }
  }
}
export default CommentRemover;
