import type { AttributeScanState } from './attributeSelector.js';
export type ScanState = AttributeScanState & {
    pseudoPrefix: string | undefined;
    previousDelim: string | undefined;
    vendorPrefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * Scan the tokens of one selector for the compatibility features checked here,
 * and record the vendor prefix of its pseudo names in `state`. This is
 * deliberately not a selector parser.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens the tokens of the selector, without an end-of-file token
 * @param {readonly string[]} browsers
 * @param {ScanState} state
 * @return {boolean}
 */
export declare function scanCompatibility(tokens: readonly import('@csstools/css-tokenizer').CSSToken[], browsers: readonly string[], state: ScanState): boolean;
//# sourceMappingURL=selectorScan.d.ts.map