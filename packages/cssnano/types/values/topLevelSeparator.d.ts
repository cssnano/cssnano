import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The index of the first token of type `separator`, at or after `start`, that
 * stands outside every pair of parentheses, or the token count when none
 * follows. A separator inside a function or a parenthesized block belongs to
 * the component around it.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {CSSToken[0]} separator
 * @return {number}
 */
export declare function topLevelSeparatorAt(tokens: readonly CSSToken[], start: number, separator: CSSToken[0]): number;
/**
 * The index of the first token from `start` to before `end` that is neither
 * whitespace nor the end of the input, or `end` when there is none: where a
 * component's content begins once its leading whitespace is trimmed.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {number}
 */
export declare function contentStart(tokens: readonly CSSToken[], start: number, end: number): number;
/**
 * One past the last token from `first` to before `end` that is neither
 * whitespace nor the end of the input, or `first` when there is none: where a
 * component's content ends once its trailing whitespace is trimmed.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} first
 * @param {number} end
 * @return {number}
 */
export declare function contentEnd(tokens: readonly CSSToken[], first: number, end: number): number;
//# sourceMappingURL=topLevelSeparator.d.ts.map