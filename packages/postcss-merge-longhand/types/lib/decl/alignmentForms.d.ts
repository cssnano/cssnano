import type { Declaration } from 'postcss';
export type AlignmentFamilyConfig = {
    shorthand: string;
    slots: Map<string, number>;
    allProps: Set<string>;
    symmetricForms: Set<string>;
    alignForms: Set<string>;
    justifyForms: Set<string>;
};
export declare const shorthandForms: Map<string, Set<string>>;
/** @type {Record<string, AlignmentFamilyConfig>} */
export declare const alignmentFamilies: Record<string, AlignmentFamilyConfig>;
/** @type {Map<string, AlignmentFamilyConfig>} */
export declare const alignmentProperties: Map<string, AlignmentFamilyConfig>;
/**
 * Parses the value of one alignment declaration into its [align, justify]
 * slots, `null` in the slot a longhand leaves untouched. Returns `null` when
 * the browser would ignore the declaration, so callers need not validate
 * separately. CSS-wide keywords and substitutions are taken as written.
 *
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration} decl
 * @return {[string | null, string | null] | null}
 */
export declare function parseAlignmentDeclaration(family: AlignmentFamilyConfig, decl: Declaration): [string | null, string | null] | null;
export declare const widelySupported: Set<string>;
/**
 * Whether one shorthand can replace the declarations without changing what
 * an engine lacking a keyword drops. That engine ignores every declaration
 * using the keyword, so all replaced declarations must need the same ones;
 * this includes a keyword on a shorthand axis a later longhand overrides.
 *
 * @param {string[]} values - each merged declaration's parsed value
 * @return {boolean}
 */
export declare function sharesKeywordSupport(values: string[]): boolean;
/**
 * Normalizes two alignment slot values into an emitted shorthand string.
 * Collapses to single value if identical and permitted by symmetricForms or global keywords.
 *
 * @param {AlignmentFamilyConfig} family
 * @param {[string, string]} values
 * @return {string}
 */
export declare function normalizeAlignment(family: AlignmentFamilyConfig, [val0, val1]: [string, string]): string;
//# sourceMappingURL=alignmentForms.d.ts.map