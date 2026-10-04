import type { Declaration, Rule } from 'postcss';
import type { VendorProfile } from './vendor-profile.js';
export type SelectorLookup = (selector: string) => import('./ensureCompatibility.js').SelectorInfo;
export type RuleMeta = {
    selectors: string[];
    declarations: Declaration[];
    /**
     * derived from `selectors`; change the list
     * only through `addSelectors` and `setSelectors` so the two stay in step
     */
    vendor?: VendorProfile;
    /**
     * `selectors` joined by commas, once known
     */
    selectorText?: string;
};
/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta]
 * @return {RuleMeta}
 */
export declare function getMeta(rule: Rule, ruleMeta?: WeakMap<Rule, RuleMeta>): RuleMeta;
/**
 * @param {RuleMeta} meta
 * @param {SelectorLookup} lookup
 * @return {VendorProfile}
 */
export declare function getVendorProfile(meta: RuleMeta, lookup: SelectorLookup): VendorProfile;
/**
 * @param {RuleMeta} meta
 * @return {string}
 */
export declare function getSelectorText(meta: RuleMeta): string;
/**
 * Lists of different lengths differ in text too, since a selector holds no
 * top-level comma, so the text of long lists is joined only when needed.
 *
 * @param {RuleMeta} a
 * @param {RuleMeta} b
 * @return {boolean}
 */
export declare function hasSameSelectors(a: RuleMeta, b: RuleMeta): boolean;
/**
 * @param {RuleMeta} meta
 * @param {string[]} selectors appended to the rule's selector list
 * @param {SelectorLookup} lookup
 */
export declare function addSelectors(meta: RuleMeta, selectors: string[], lookup: SelectorLookup): void;
/**
 * @param {RuleMeta} meta
 * @param {string[]} selectors replaces the rule's selector list
 * @param {VendorProfile} [vendor] the profile of `selectors` when the caller
 * already knows it; otherwise it is derived on the next `getVendorProfile`
 */
export declare function setSelectors(meta: RuleMeta, selectors: string[], vendor?: VendorProfile): void;
/** @param {Rule} rule @return {Declaration[]} */
export declare function getDecls(rule: Rule): Declaration[];
//# sourceMappingURL=rule-meta.d.ts.map