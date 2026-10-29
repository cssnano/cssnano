export type Options = {
    /**
     * Removes comments marked as important (`/*!`) too. (default: false)
     */
    removeAll?: boolean | undefined;
    /**
     * Removes comments marked as important, except the first one. (default: false)
     */
    removeAllButFirst?: boolean | undefined;
    /**
     * Returns true to remove a comment. Receives the comment text without its delimiters.
     */
    remove?: ((s: string) => boolean) | undefined;
};
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
declare const discardComments: {
    create(options: Options): {
        comments(): (text: string) => boolean;
    };
};
export { discardComments as default };
//# sourceMappingURL=index.d.ts.map