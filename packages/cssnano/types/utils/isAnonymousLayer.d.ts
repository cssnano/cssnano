import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * Whether a layer block is anonymous: its prelude is blank, or holds only
 * comments. The prelude is the tokens of its params as PostCSS keeps them.
 *
 * @param {readonly CSSToken[]} prelude
 * @return {boolean}
 */
declare function isAnonymousLayer(prelude: readonly CSSToken[]): boolean;
export default isAnonymousLayer;
//# sourceMappingURL=isAnonymousLayer.d.ts.map