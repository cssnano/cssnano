import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * A comment whose text starts with `!` is the convention for licenses and notices
 * that minifiers keep.
 * @param {string} text comment text, excluding the delimiters
 * @return {boolean}
 */
declare function isImportantComment(text: string): boolean;
/**
 * Whether a comment token is an important comment, for code that walks tokens
 * rather than PostCSS comment nodes.
 * @param {CSSToken} token
 * @return {boolean}
 */
export declare function isImportantCommentToken(token: CSSToken): boolean;
export default isImportantComment;
//# sourceMappingURL=isImportantComment.d.ts.map