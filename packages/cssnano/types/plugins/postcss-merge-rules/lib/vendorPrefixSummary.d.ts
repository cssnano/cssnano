/**
 * What one selector contributes: its vendor prefix, `''` when it has none and
 * `undefined` when unknown or when it mixes prefixes.
 *
 * @typedef {{prefix: string | undefined, msPlaceholder: boolean}} SelectorVendor
 */
export type SelectorVendor = {
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * What a selector list contributes to the vendor-prefix merge check.
 * Merging a rule for into a rule for the same selector but with different prefixes
 * would change where the rule applies.
 */
export declare class VendorPrefixSummary {
    #private;
    /**
     * @param {string | null | undefined} prefix
     * @param {boolean} msPlaceholder
     */
    constructor(prefix: string | null | undefined, msPlaceholder: boolean);
    /**
     * @param {SelectorVendor[]} selectors
     * @return {VendorPrefixSummary}
     */
    static of(selectors: SelectorVendor[]): VendorPrefixSummary;
    /**
     * Folds one selector in place, so a growing list needs no rescan.
     *
     * @param {SelectorVendor} selector the vendor facts of one selector;
     * an unknown `prefix` blocks every merge
     */
    add(selector: SelectorVendor): void;
    /**
     * The profile of this selector list followed by another, without
     * rescanning. Neither operand changes.
     *
     * @param {VendorPrefixSummary} other
     * @return {VendorPrefixSummary}
     */
    concat(other: VendorPrefixSummary): VendorPrefixSummary;
    /**
     * Whether two selector lists may share a rule: both unprefixed, or both
     * carrying the same single prefix, except that two `-ms-input-placeholder`
     * lists never merge because Edge and Internet Explorer disagree on the
     * pseudo's spelling.
     *
     * @param {VendorPrefixSummary} other
     * @return {boolean}
     */
    allowsMerge(other: VendorPrefixSummary): boolean;
}
//# sourceMappingURL=vendorPrefixSummary.d.ts.map