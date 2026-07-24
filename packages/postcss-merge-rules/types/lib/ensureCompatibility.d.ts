declare const _exports: {
    sameVendor: typeof sameVendor;
    noVendor: typeof noVendor;
    pseudoElements: {
        ':active': string;
        ':after': string;
        ':any-link': string;
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
        ':required': string;
        ':root': string;
        ':target': string;
        '::after': string;
        '::backdrop': string;
        '::before': string;
        '::first-letter': string;
        '::first-line': string;
        '::marker': string;
        '::placeholder': string;
        '::selection': string;
        ':valid': string;
        ':visited': string;
    };
    ensureCompatibility: typeof ensureCompatibility;
};
export = _exports;
/**
 * @param {string[]} selectorsA
 * @param {string[]} selectorsB
 * @return {boolean}
 */
declare function sameVendor(selectorsA: string[], selectorsB: string[]): boolean;
/**
 * @param {string} selector
 * @return {boolean}
 */
declare function noVendor(selector: string): boolean;
/**
 * @param {string[]} selectors
 * @param{string[]=} browsers
 * @param{Map<string,boolean>=} compatibilityCache
 * @return {boolean}
 */
declare function ensureCompatibility(selectors: string[], browsers?: string[] | undefined, compatibilityCache?: Map<string, boolean> | undefined): boolean;
//# sourceMappingURL=ensureCompatibility.d.ts.map