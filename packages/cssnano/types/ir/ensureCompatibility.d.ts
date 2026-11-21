import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorInfo = {
    compatible: boolean;
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * The facts of the selector that a token list spells, for the browsers given.
 * It stops at the first unsupported token, so it never learns the prefix of an
 * incompatible selector. A selector the scan accepts can still be one the
 * parser rejects; the merge asks the parser separately.
 *
 * @param {readonly CSSToken[]} tokens the tokens of one selector item
 * @param {readonly string[]} browsers
 * @return {SelectorInfo}
 */
export declare function selectorInfoOf(tokens: readonly CSSToken[], browsers: readonly string[]): SelectorInfo;
//# sourceMappingURL=ensureCompatibility.d.ts.map