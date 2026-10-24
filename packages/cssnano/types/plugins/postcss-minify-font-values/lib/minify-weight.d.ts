import type { CSSToken } from '@csstools/css-tokenizer';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The font-weight value as tokens. Only a lone `normal` or `bold` changes.
 *
 * @param {readonly CSSToken[]} input
 * @return {CSSToken[]}
 */
declare function minifyWeightTokens(input: readonly CSSToken[]): CSSToken[];
/**
 * @param {string} value
 * @return {string}
 */
declare function minifyWeight(value: string): string;
export default minifyWeight;
export { minifyWeightTokens };
//# sourceMappingURL=minify-weight.d.ts.map