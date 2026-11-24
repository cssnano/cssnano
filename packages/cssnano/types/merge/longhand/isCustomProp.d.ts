/**
 * Whether a `var()` in the tokens names a custom property.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} input
 * @return {boolean}
 */
export declare function opensCustomPropertyVar(input: readonly import('@csstools/css-tokenizer').CSSToken[]): boolean;
/**
 * Whether a value can hold a custom property name or an escape that spells
 * one, the only spellings a `var()` of a custom property needs.
 *
 * @param {string} value
 * @return {boolean}
 */
export declare function mayNameCustomProperty(value: string): boolean;
export default _default;
/**
 * @param {import('./blockDeclarations.js').DeclarationItem} node
 */
declare function _default(node: import('./blockDeclarations.js').DeclarationItem): boolean;
//# sourceMappingURL=isCustomProp.d.ts.map