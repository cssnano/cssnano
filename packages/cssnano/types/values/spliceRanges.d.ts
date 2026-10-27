/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from './valueBuffer.js' */
import type { CSSToken } from '@csstools/css-tokenizer';
import type { TokenEdit } from './valueBuffer.js';
/**
 * A new token list with each edit's range replaced, O(n + m) for n tokens and
 * m replacement tokens. Indexes refer to the list before the call, and the
 * edits are in ascending order without overlap.
 *
 * @param {readonly CSSToken[]} list
 * @param {readonly TokenEdit[]} edits
 * @return {CSSToken[]}
 */
declare function spliceRanges(list: readonly CSSToken[], edits: readonly TokenEdit[]): CSSToken[];
export { spliceRanges };
//# sourceMappingURL=spliceRanges.d.ts.map