export type Options = {
    /**
     * Removes comments marked as important (`/*!`) too. (default: false)
     */
    removeAll?: boolean | undefined;
    /**
     * Returns true to remove a comment. Receives the comment text without its delimiters.
     */
    remove?: ((s: string) => boolean) | undefined;
};
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
declare const discardComments: {
    create(options: Options): {
        comments(): (text: string) => boolean;
    };
};
export { discardComments as default };
//# sourceMappingURL=index.d.ts.map