import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The tokens of the value as PostCSS parses it. A comment survives only
 * between two tokens that are neither spaces nor the edges of the value, and
 * not after a comma.
 *
 * @param {readonly CSSToken[]} input
 * @return {CSSToken[]}
 */
export declare function parsedValueTokens(input: readonly CSSToken[]): CSSToken[];
/**
 * The text of the value as PostCSS parses it.
 *
 * @param {readonly CSSToken[]} input
 * @return {string}
 */
export declare function parsedValueText(input: readonly CSSToken[]): string;
//# sourceMappingURL=parsedValueText.d.ts.map