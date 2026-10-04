export declare const pseudoElements: {
    ':active': string;
    ':after': string;
    ':any-link': string;
    ':autofill': string;
    ':before': string;
    ':checked': string;
    ':default': string;
    ':dir': string;
    ':disabled': string;
    ':empty': string;
    ':enabled': string;
    ':first-child': string;
    ':first-letter': string;
    ':first-line': string;
    ':first-of-type': string;
    ':focus': string;
    ':focus-within': string;
    ':focus-visible': string;
    ':fullscreen': string;
    ':has': string;
    ':hover': string;
    ':in-range': string;
    ':indeterminate': string;
    ':invalid': string;
    ':is': string;
    ':lang': string;
    ':last-child': string;
    ':last-of-type': string;
    ':link': string;
    ':matches': string;
    ':modal': string;
    ':not': string;
    ':nth-child': string;
    ':nth-last-child': string;
    ':nth-last-of-type': string;
    ':nth-of-type': string;
    ':only-child': string;
    ':only-of-type': string;
    ':optional': string;
    ':out-of-range': string;
    ':placeholder-shown': string;
    ':read-only': string;
    ':read-write': string;
    ':required': string;
    ':root': string;
    ':target': string;
    ':where': string;
    '::after': string;
    '::backdrop': string;
    '::before': string;
    '::file-selector-button': string;
    '::first-letter': string;
    '::first-line': string;
    '::marker': string;
    '::placeholder': string;
    '::selection': string;
    ':valid': string;
    ':visited': string;
};
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
import type { AttributeScanState } from './attributeSelector.js';
export type ScanState = AttributeScanState & {
    pseudoPrefix: string | undefined;
    previousDelim: string | undefined;
    vendorPrefix: string | undefined;
    msPlaceholder: boolean;
};
export type SelectorInfo = {
    compatible: boolean;
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * Looks up selectors in a cache that is shared by every check, so each
 * distinct selector is scanned once per stylesheet.
 *
 * @param {string[] | undefined} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @return {(selector: string) => SelectorInfo}
 */
export declare function createSelectorLookup(browsers: string[] | undefined, cache?: Map<string, SelectorInfo>): (selector: string) => SelectorInfo;
/**
 * @param {string[]} selectors
 * @param {(selector: string) => SelectorInfo} lookup
 * @return {boolean}
 */
export declare function selectorsCompatible(selectors: string[], lookup: (selector: string) => SelectorInfo): boolean;
//# sourceMappingURL=ensureCompatibility.d.ts.map