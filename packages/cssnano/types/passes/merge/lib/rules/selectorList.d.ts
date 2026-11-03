import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { Rule } from 'postcss';
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { SelectorRange } from '../../../../values/selectorRanges.js';
import type { TextTable } from '../../../../values/textTable.js';
export type SelectorLookup = (selector: string, list?: SelectorList, index?: number) => import('./ensureCompatibility.js').SelectorInfo;
export type ElementKeyOf = (selector: string, piece: RangePiece | null) => string | null;
export type SelectorRanges = {
    source: string;
    tokens: readonly CSSToken[];
    spans: SelectorRange[];
};
/**
 * The selector list of a rule with the facts derived from it, each computed on
 * first use and then grown incrementally as the list grows. It is the base of
 * `RuleRecord`, not a member of it, so a rule is one object with one layout.
 */
export declare class SelectorList {
    #private;
    /**
     * @param {Rule} node
     * @param {string[]} selectors
     */
    constructor(node: Rule, selectors: string[]);
    /** @return {Rule} the rule the list belongs to, which is never changed */
    get node(): Rule;
    /** @return {string[]} change it only through the methods of this class */
    get selectors(): string[];
    /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
    get pieces(): RangePiece[] | null | undefined;
    /** @param {RangePiece[] | null} pieces one per selector, or null */
    setPieces(pieces: RangePiece[] | null): void;
    /**
     * The token ranges of the selectors, found in the tokens the table gives the
     * rule's text. They are derived at the first read, and derived again only when
     * those tokens change.
     *
     * @param {TextTable} table
     * @return {SelectorRanges}
     */
    rangesOf(table: TextTable): SelectorRanges;
    /**
     * @param {SelectorLookup} lookup
     * @return {VendorPrefixSummary}
     */
    vendorProfile(lookup: SelectorLookup): VendorPrefixSummary;
    /**
     * Whether every selector is compatible with the target browsers. It is read
     * once and then kept: a grown list ANDs in the answer for its new selectors.
     *
     * @param {SelectorLookup} lookup
     * @return {boolean}
     */
    compatible(lookup: SelectorLookup): boolean;
    /**
     * The elements the selector list can match, as `elementKeyOf` in
     * `elementKeys.js` describes them, or null when any selector has no key or
     * there are none, which must not read as a rule that writes to no element.
     * A caller must not hold the list across a change to the list.
     *
     * @param {ElementKeyOf} [keyOf] the key of one selector
     * @return {string[] | null}
     */
    elementKeys(keyOf?: ElementKeyOf): string[] | null;
    /** @return {string} */
    selectorText(): string;
    /**
     * Lists of different lengths differ in text too, since a selector holds no
     * top-level comma, so the text of long lists is joined only when needed.
     *
     * @param {SelectorList} other
     * @return {boolean}
     */
    hasSameSelectors(other: SelectorList): boolean;
    /**
     * @param {string[]} selectors appended to the list
     * @param {SelectorLookup} lookup
     * @param {ElementKeyOf} [keyOf]
     * @param {RangePiece[] | null} [pieces] the token range of each selector of
     * the list after the call, or null when they are not known
     * @return {readonly string[] | null} the element keys the selectors add to
     * those listed, or null when the elements are not listed
     */
    addSelectors(selectors: string[], lookup: SelectorLookup, keyOf?: ElementKeyOf, pieces?: RangePiece[] | null): readonly string[] | null;
    /**
     * Takes the place of a list that stood before this one, so its selectors
     * come first. The earlier list grows in place and passes to this one, and
     * the joined text is concatenated from the two texts: copying or re-joining
     * a long list on every merge would take quadratic time.
     *
     * @param {SelectorList} earlier left unusable
     * @param {SelectorLookup} lookup
     * @param {ElementKeyOf} [keyOf]
     */
    absorbEarlier(earlier: SelectorList, lookup: SelectorLookup, keyOf?: ElementKeyOf): void;
}
//# sourceMappingURL=selectorList.d.ts.map