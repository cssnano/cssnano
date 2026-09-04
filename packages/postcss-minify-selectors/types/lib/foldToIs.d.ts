export type Specificity = import('./specificity.js').Specificity;
export type HasSpecificity = import('./specificity.js').HasSpecificity;
export type FunctionResult = {
    raw?: {
        source: string;
        start: number;
        end: number;
    };
    pieces?: (string | FunctionResult)[];
    text?: string;
    specificity: Specificity;
    foldEligible?: boolean;
    outcome?: 'valid' | 'invalid' | 'opaque';
    valid: boolean;
    hasNestedHas?: boolean;
    hasPseudoElement?: boolean;
};
export type Compound = {
    pieces: (string | FunctionResult)[];
    specificity: Specificity;
    hasNamespace: boolean;
    hasPseudoElement: boolean;
    hasFunction: boolean;
    hasNesting: boolean;
    hasAttributeModifier: boolean;
    hasCommentDescendant: boolean;
    hasVendorPseudo: boolean;
    foldEligible: boolean;
    valid: boolean;
    hasNestedHas?: boolean;
};
export type ComplexSelector = {
    parts: (Compound | string)[];
    leadingCombinator?: string;
    valid: boolean;
    hasFunction: boolean;
    hasVendorPseudo: boolean;
    specificity: Specificity;
    serializationKey?: string;
    hasNestedHas?: boolean;
    hasPseudoElement?: boolean;
};
/** @typedef {import('./specificity.js').Specificity} Specificity */
/** @typedef {import('./specificity.js').HasSpecificity} HasSpecificity */
/**
 * @typedef {{
 *   raw?: { source: string, start: number, end: number },
 *   pieces?: (string | FunctionResult)[],
 *   text?: string,
 *   specificity: Specificity,
 *   foldEligible?: boolean,
 *   outcome?: 'valid' | 'invalid' | 'opaque',
 *   valid: boolean,
 *   hasNestedHas?: boolean,
 *   hasPseudoElement?: boolean
 * }} FunctionResult
 */
/**
 * @typedef {{
 *   pieces: (string | FunctionResult)[],
 *   specificity: Specificity,
 *   hasNamespace: boolean,
 *   hasPseudoElement: boolean,
 *   hasFunction: boolean,
 *   hasNesting: boolean,
 *   hasAttributeModifier: boolean,
 *   hasCommentDescendant: boolean,
 *   hasVendorPseudo: boolean,
 *   foldEligible: boolean,
 *   valid: boolean,
 *   hasNestedHas?: boolean
 * }} Compound
 */
/**
 * @typedef {{
 *   parts: (Compound | string)[],
 *   leadingCombinator?: string,
 *   valid: boolean,
 *   hasFunction: boolean,
 *   hasVendorPseudo: boolean,
 *   specificity: Specificity,
 *   serializationKey?: string,
 *   hasNestedHas?: boolean,
 *   hasPseudoElement?: boolean
 * }} ComplexSelector
 */
/**
 * @param {readonly (string | FunctionResult)[] | undefined} rootPieces
 * @return {string}
 */
export declare function serializePieces(rootPieces: readonly (string | FunctionResult)[] | undefined): string;
/**
 * @param {ComplexSelector} selector
 * @return {string}
 */
export declare function serializeComplex(selector: ComplexSelector): string;
/**
 * @param {readonly (string | FunctionResult)[]} a
 * @param {readonly (string | FunctionResult)[]} b
 * @return {boolean}
 */
export declare function equalPieces(a: readonly (string | FunctionResult)[], b: readonly (string | FunctionResult)[]): boolean;
/**
 * @param {Compound} a
 * @param {Compound} b
 * @return {boolean}
 */
export declare function equalCompound(a: Compound, b: Compound): boolean;
/**
 * @param {ComplexSelector} a
 * @param {ComplexSelector} b
 * @return {boolean}
 */
export declare function equalComplex(a: ComplexSelector, b: ComplexSelector): boolean;
/**
 * @param {Compound | string} a
 * @param {Compound | string} b
 * @return {boolean}
 */
export declare function samePart(a: Compound | string, b: Compound | string): boolean;
export type CandidateOccurrence = {
    selectorIndex: number;
    compoundIndex: number;
    compound: Compound;
    selector: ComplexSelector;
};
export type CandidateGroup = {
    occurrences: CandidateOccurrence[];
    prefixParts: (Compound | string)[];
    suffixParts: (Compound | string)[];
    middleSpecificity: Specificity;
};
export type ValidatedFold = {
    group: CandidateGroup;
    indices: number[];
    uniqueCompounds: Compound[];
    foldedText: string;
    savings: number;
    firstIndex: number;
};
/**
 * @param {ComplexSelector[]} selectors
 * @param {boolean} [sort]
 * @return {ComplexSelector[]}
 */
export declare function fold(selectors: ComplexSelector[], sort?: boolean): ComplexSelector[];
//# sourceMappingURL=foldToIs.d.ts.map