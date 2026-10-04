import type { Declaration, Rule } from 'postcss';
import type { VendorProfile } from './vendor-profile.js';
export type SelectorLookup = (selector: string) => import('./ensureCompatibility.js').SelectorInfo;
/**
 * The selector list of a rule with what is derived from it. Every field is
 * set up front so all instances share one object layout.
 */
export declare class RuleMeta {
    #private;
    /**
     * @param {string[]} selectors
     * @param {Declaration[]} declarations
     */
    constructor(selectors: string[], declarations: Declaration[]);
    /** @return {string[]} change it only through the methods of this class */
    get selectors(): string[];
    /** @return {Declaration[]} */
    get declarations(): Declaration[];
    /** @param {Declaration[]} declarations */
    setDeclarations(declarations: Declaration[]): void;
    /**
     * @param {SelectorLookup} lookup
     * @return {VendorProfile}
     */
    vendorProfile(lookup: SelectorLookup): VendorProfile;
    /** @return {string} */
    selectorText(): string;
    /**
     * Lists of different lengths differ in text too, since a selector holds no
     * top-level comma, so the text of long lists is joined only when needed.
     *
     * @param {RuleMeta} other
     * @return {boolean}
     */
    hasSameSelectors(other: RuleMeta): boolean;
    /**
     * @param {string[]} selectors appended to the rule's selector list
     * @param {SelectorLookup} lookup
     */
    addSelectors(selectors: string[], lookup: SelectorLookup): void;
    /**
     * @param {string[]} selectors replaces the rule's selector list
     * @param {VendorProfile} [vendor] the profile of `selectors` when the caller
     * already knows it; otherwise it is derived on the next `vendorProfile`
     */
    setSelectors(selectors: string[], vendor?: VendorProfile): void;
    /**
     * Takes the place of a rule that is dropped and stood before this one, so
     * its selectors come first. The dropped rule's list grows in place and
     * passes to this one, and the joined text is concatenated from the two
     * texts: copying or re-joining a long list on every merge would take
     * quadratic time.
     *
     * @param {RuleMeta} earlier left unusable
     * @param {SelectorLookup} lookup
     */
    absorbEarlier(earlier: RuleMeta, lookup: SelectorLookup): void;
}
/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta]
 * @return {RuleMeta}
 */
export declare function getMeta(rule: Rule, ruleMeta?: WeakMap<Rule, RuleMeta>): RuleMeta;
/** @param {Rule} rule @return {Declaration[]} */
export declare function getDecls(rule: Rule): Declaration[];
//# sourceMappingURL=rule-meta.d.ts.map