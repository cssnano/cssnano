import type { TokenListId } from '../../../ir/tokenLists.js';
import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorInfo = {
    compatible: boolean;
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * The facts of the selector that a token list spells, for the browsers given.
 * The scan runs first, since it is far cheaper than a parse, and it stops at
 * the first unsupported token, so it never learns the prefix of an
 * incompatible selector.
 *
 * @param {readonly CSSToken[]} tokens the tokens of one selector item
 * @param {readonly string[]} browsers
 * @return {SelectorInfo}
 */
export declare function selectorInfoOf(tokens: readonly CSSToken[], browsers: readonly string[]): SelectorInfo;
/**
 * @param {readonly TokenListId[]} ids the id of each selector of a list
 * @param {(id: TokenListId) => SelectorInfo} lookup
 * @return {boolean}
 */
export declare function selectorsCompatible(ids: readonly TokenListId[], lookup: (id: TokenListId) => SelectorInfo): boolean;
//# sourceMappingURL=ensureCompatibility.d.ts.map