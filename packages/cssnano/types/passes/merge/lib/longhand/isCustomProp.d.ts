/**
 * Whether a `var()` in the tokens names a custom property.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} input
 * @return {boolean}
 */
export declare function opensCustomPropertyVar(input: readonly import('@csstools/css-tokenizer').CSSToken[]): boolean;
export default _default;
/**
 * @param {import('postcss').Declaration} node
 * @param {import('../../../../values/textTable.js').TextTable} textTable the tokens the walk left for the declaration
 */
declare function _default(node: import('postcss').Declaration, textTable: import('../../../../values/textTable.js').TextTable): boolean;
//# sourceMappingURL=isCustomProp.d.ts.map