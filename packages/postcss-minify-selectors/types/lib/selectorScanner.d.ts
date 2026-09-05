import cssnanoUtils from 'cssnano-utils';
/** @type {typeof cssnanoUtils.balancedTokens} */
declare const balancedTokens: typeof cssnanoUtils.balancedTokens;
export type CSSToken = import('./tokenUtils.js').CSSToken;
export type BalancedTokenStructure = NonNullable<ReturnType<typeof balancedTokens>>;
export type Specificity = import('./specificity.js').Specificity;
export type FunctionResult = import('./foldToIs.js').FunctionResult;
export type Compound = import('./foldToIs.js').Compound;
export type ComplexSelector = import('./foldToIs.js').ComplexSelector;
export type ArgumentGrammar = import('./grammar.js').ArgumentGrammar;
export type NormalizationState = {
    output: (string | FunctionResult)[];
    specificity: Specificity;
    hasNamespace: boolean;
    hasPseudoElement: boolean;
    hasFunction: boolean;
    hasNesting: boolean;
    hasAttributeModifier: boolean;
    hasCommentDescendant: boolean;
    allPseudosSafe: boolean;
    hasVendorPseudo: boolean;
    foldEligible: boolean;
    valid: boolean;
    hasNestedHas: boolean;
};
/**
 * @param {string} source
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 * @return {string}
 */
declare function normalizeList(source: string, sort?: boolean, convertToIs?: boolean, keyframe?: boolean, hasDefaultNamespace?: boolean): string;
/**
 * Normalize an already-tokenized selector list. This is the compatibility
 * boundary used while normalization families move to arena overlays.
 * @param {string} source
 * @param {BalancedTokenStructure} structure
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 * @return {string}
 */
declare function normalizeParsedList(source: string, structure: BalancedTokenStructure, sort?: boolean, convertToIs?: boolean, keyframe?: boolean, hasDefaultNamespace?: boolean): string;
/** @param {string} source @return {string} */
declare function specificityOf(source: string): string;
/** @param {string} source @param {boolean} [sort] @return {ComplexSelector[]} */
declare function parseSelectorList(source: string, sort?: boolean): ComplexSelector[];
export { normalizeList, normalizeParsedList, specificityOf, parseSelectorList };
//# sourceMappingURL=selectorScanner.d.ts.map