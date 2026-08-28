/**
 * @param {string} value
 * @return {boolean}
 */
export declare function isCustomProperty(value: string): boolean;
/** @param {string[]} values @return {boolean} */
export declare function canMergeValues(values: string[]): boolean;
/** @param {string[]} mapped @return {boolean} */
export declare function isCloseEnough(mapped: string[]): boolean;
/** @param {string[]} mapped @return {string[]} */
export declare function getDistinctShorthands(mapped: string[]): string[];
/**
 * @param {[string, string, string]} values
 * @param {[string, string, string]} nextValues
 * @param {string[]} components
 * @return {string[]}
 */
export declare function diffingProps(values: [string, string, string], nextValues: [string, string, string], components: string[]): string[];
//# sourceMappingURL=borderPredicates.d.ts.map