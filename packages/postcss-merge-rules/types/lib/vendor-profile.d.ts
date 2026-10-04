/**
 * The vendor prefix of a pseudo-class or pseudo-element name, such as
 * `-moz-` for `-moz-selection`; a prefix is meaningful only at the start of
 * an identifier, so `x-moz-y` has none.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {string} the prefix, or the empty string when there is none
 */
export declare function vendorPrefixOf(name: string): string;
/**
 * Internet Explorer uses :-ms-input-placeholder.
 * Microsoft Edge uses ::-ms-input-placeholder.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {boolean}
 */
export declare function isMsInputPlaceholder(name: string): boolean;
export type VendorProfile = {
    prefix: string | null | undefined;
    msPlaceholder: boolean;
};
export type SelectorVendor = {
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * What a selector list contributes to the vendor-prefix merge check.
 * `prefix` is the one vendor prefix shared by every selector: `null` for an
 * empty list, `''` when none is prefixed, and `undefined` when the list mixes
 * prefixed and unprefixed selectors or different prefixes. Merging a mixed
 * list would drop its unprefixed selectors from engines matching the prefixed
 * ones, and merging different prefixes drops rules from other engines.
 *
 * @typedef {{prefix: string | null | undefined, msPlaceholder: boolean}} VendorProfile
 */
/**
 * What one selector contributes: its vendor prefix, `''` when it has none and
 * `undefined` when unknown or when it mixes prefixes.
 *
 * @typedef {{prefix: string | undefined, msPlaceholder: boolean}} SelectorVendor
 */
/**
 * Folds one selector into a profile, so a growing list needs no rescan.
 *
 * @param {VendorProfile} profile
 * @param {SelectorVendor} selector the vendor facts of one selector;
 * an unknown `prefix` blocks every merge
 * @return {VendorProfile}
 */
export declare function addToVendorProfile(profile: VendorProfile, selector: SelectorVendor): VendorProfile;
/**
 * The profile of one selector list followed by another, without rescanning.
 *
 * @param {VendorProfile} a
 * @param {VendorProfile} b
 * @return {VendorProfile}
 */
export declare function combineVendorProfiles(a: VendorProfile, b: VendorProfile): VendorProfile;
/**
 * @param {SelectorVendor[]} selectors
 * @return {VendorProfile}
 */
export declare function vendorProfile(selectors: SelectorVendor[]): VendorProfile;
/**
 * Whether two selector lists may share a rule: both unprefixed, or both
 * carrying the same single prefix, except that two `-ms-input-placeholder`
 * lists never merge because Edge and Internet Explorer disagree on the
 * pseudo's spelling.
 *
 * @param {VendorProfile} a
 * @param {VendorProfile} b
 * @return {boolean}
 */
export declare function vendorsAllowMerge(a: VendorProfile, b: VendorProfile): boolean;
//# sourceMappingURL=vendor-profile.d.ts.map