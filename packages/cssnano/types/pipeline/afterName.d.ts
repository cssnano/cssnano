import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * Whether the space after an at-rule name can go for a prelude: it starts with
 * a parenthesis, and its brackets balance. The tokens spell the prelude.
 *
 * @param {string} prelude the prelude after the walk
 * @param {readonly CSSToken[] | undefined} list the tokens that spell it
 * @return {boolean}
 */
export declare function startsWithBalancedParen(prelude: string, list: readonly CSSToken[] | undefined): boolean;
/**
 * Sets the space after an at-rule name for the prelude that the walk wrote. An
 * empty prelude takes no space. A prelude that starts with a parenthesis takes
 * none either, unless its brackets do not balance, when the prelude is left as
 * written.
 *
 * @param {import('postcss').AtRule} atRule
 * @param {string} prelude the prelude after the walk
 * @param {boolean} startsBalanced whether the prelude starts with a balanced
 *   parenthesis, as startsWithBalancedParen tells
 */
export declare function tightenAfterName(atRule: import('postcss').AtRule, prelude: string, startsBalanced: boolean): void;
//# sourceMappingURL=afterName.d.ts.map