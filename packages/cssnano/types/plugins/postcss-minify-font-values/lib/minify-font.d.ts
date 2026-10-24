import { balancedStructure } from '../../../utils/value.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { Options } from '../index.js';
export type BalancedTokens = NonNullable<ReturnType<typeof balancedStructure>>;
/**
 * The font shorthand as tokens, minified. The list is unchanged when the
 * font-size cannot be found safely.
 *
 * @param {readonly CSSToken[]} input
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {CSSToken[]}
 */
declare function minifyFontTokens(input: readonly CSSToken[], opts: Options, removeQuotes?: Options['removeQuotes']): CSSToken[];
/**
 * @param {string} value
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {string}
 */
declare function minifyFont(value: string, opts: Options, removeQuotes?: Options['removeQuotes']): string;
export default minifyFont;
export { minifyFontTokens };
//# sourceMappingURL=minify-font.d.ts.map