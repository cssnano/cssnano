import type { AttributeScanState } from './attributeSelector.js';
export type ScanState = AttributeScanState & {
    pseudoPrefix: string | undefined;
    previousDelim: string | undefined;
    vendorPrefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * Scan selector tokens for the compatibility features checked here, and
 * record the vendor prefix of its pseudo names in `state`. This is
 * deliberately not a selector parser.
 *
 * @param {string} selector
 * @param {string[] | undefined} browsers
 * @param {ScanState} state
 * @return {boolean}
 */
export declare function scanCompatibility(selector: string, browsers: string[] | undefined, state: ScanState): boolean;
//# sourceMappingURL=selectorScan.d.ts.map