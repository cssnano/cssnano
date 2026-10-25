import type { CSSToken } from '@csstools/css-tokenizer';
import type { Options } from '../index.js';
/**
 * Writes a family name as identifiers. The values of the identifiers, joined
 * by single spaces, give the name back. Each spelling is the one that reads
 * back as that identifier.
 *
 * @param {string} name the decoded family name
 * @return {{text: string, value: string}[]}
 */
declare function familyIdentifiers(name: string): {
    text: string;
    value: string;
}[];
/**
 * The text of a token list.
 *
 * @param {readonly CSSToken[]} list
 * @return {string}
 */
declare function tokensText(list: readonly CSSToken[]): string;
/**
 * The font-family list as tokens, minified. The list is unchanged when its
 * brackets do not balance.
 *
 * @param {readonly CSSToken[]} input
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {CSSToken[]}
 */
declare function minifyFamilyTokens(input: readonly CSSToken[], opts: Options, removeQuotes?: Options['removeQuotes']): CSSToken[];
/**
 * The font-family value as a string, minified.
 *
 * @param {string} value
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {string}
 */
declare function minifyFamily(value: string, opts: Options, removeQuotes?: Options['removeQuotes']): string;
export default minifyFamily;
export { familyIdentifiers, minifyFamilyTokens, tokensText };
//# sourceMappingURL=minify-family.d.ts.map