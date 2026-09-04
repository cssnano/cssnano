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
    attributes: {
        operator: boolean;
        value: boolean;
    }[];
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
/** @param {string} source @param {boolean} [sort] @param {boolean} [convertToIs] @return {string} */
declare function normalizeList(source: string, sort?: boolean, convertToIs?: boolean): string;
/** @param {string} source @return {string[]} */
declare function splitList(source: string): string[];
/** @param {string} source @return {string} */
declare function specificityOf(source: string): string;
/** @param {string} source @param {boolean} [sort] @return {ComplexSelector[]} */
declare function parseSelectorList(source: string, sort?: boolean): ComplexSelector[];
export { normalizeList, splitList, specificityOf, parseSelectorList };
//# sourceMappingURL=selectorScanner.d.ts.map