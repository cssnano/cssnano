/**
 * Joins the width, style and color that name the border's components, dropping
 * each one that spells its initial value unless the component before it spells
 * the same text. The three components never share text, so a top-right-bottom-
 * left shorthand could not shorten them further.
 *
 * @param {string | undefined} width the width as written, or undefined when unnamed
 * @param {string | undefined} style the style as written, or undefined when unnamed
 * @param {string | undefined} color the color as written, or undefined when unnamed
 * @return {string}
 */
export declare function minifyComponents(width: string | undefined, style: string | undefined, color: string | undefined): string;
export default _default;
/**
 * @param {string} cssPropertyValue
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [tokens] the tokens
 * `cssPropertyValue` spells
 */
declare function _default(cssPropertyValue: string, tokens?: readonly import('@csstools/css-tokenizer').CSSToken[]): string;
//# sourceMappingURL=minifyWsc.d.ts.map