/** @param {string} value */
export declare const isCustomProperty: (value: string) => boolean;
/** @param {string[]} values */
export declare const canMergeValues: (values: string[]) => boolean;
/** @param {string[]} m */
export declare const isCloseEnough: (m: string[]) => boolean;
/** @param {string[]} mapped */
export declare const getDistinctShorthands: (mapped: string[]) => string[];
/**
 * @param {[string, string, string]} values
 * @param {[string, string, string]} nextValues
 * @param {string[]} components
 * @return {string[]}
 */
export declare function diffingProps(values: [string, string, string], nextValues: [string, string, string], components: string[]): string[];
//# sourceMappingURL=borderPredicates.d.ts.map