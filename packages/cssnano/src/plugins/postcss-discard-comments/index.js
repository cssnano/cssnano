import CommentRemover from './lib/commentRemover.js';

/** @import {StageEntry} from '../../pipeline/host.js' */

/** @typedef {object} Options
 *  @property {boolean=} removeAll Removes comments marked as important (`/*!`) too. (default: false)
 *  @property {(s: string) => boolean=} remove Returns true to remove a comment. Receives the comment text without its delimiters.
 */

/**
 * The comment part of the stage. A comment marked as important (`/*!`) is
 * kept unless `removeAll` or `remove` asks for it, since it often carries a
 * license notice.
 *
 * @satisfies {StageEntry}
 */
const discardComments = {
  create(/** @type {Options} */ options) {
    return {
      comments() {
        const remover = new CommentRemover(options);
        return (text) => Boolean(remover.canRemove(text));
      },
    };
  },
};

export { discardComments as default };
