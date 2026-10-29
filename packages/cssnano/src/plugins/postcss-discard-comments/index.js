import CommentRemover from './lib/commentRemover.js';

/** @import {StageEntry} from '../../pipeline/host.js' */

/** @typedef {object} Options
 *  @property {boolean=} removeAll Removes comments marked as important (`/*!`) too. (default: false)
 *  @property {boolean=} removeAllButFirst Removes comments marked as important, except the first one. (default: false)
 *  @property {(s: string) => boolean=} remove Returns true to remove a comment. Receives the comment text without its delimiters.
 */

/**
 * The comment part of the stage. The walk calls `comments` once per stylesheet,
 * so each stylesheet counts its own first important comment.
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
