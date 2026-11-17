declare const cssSel2 = "css-sel2";
declare const cssSel3 = "css-sel3";
import type { FeatureKey } from '#utils';
/** @import {FeatureKey} from '#utils' */
export { cssSel2, cssSel3 };
/** @type {Record<string, FeatureKey>} */
export declare const pseudoElements: Record<string, FeatureKey>;
/**
 * Whether a pseudo-class or pseudo-element name is a vendor-specific
 * extension. CSS reserves every name starting with a dash for them, including
 * prefixes no browser is known to use.
 *
 * @param {string} name unescaped
 * @return {boolean}
 */
export declare function isVendorExtension(name: string): boolean;
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
//# sourceMappingURL=pseudoSupport.d.ts.map