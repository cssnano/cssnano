/**
 * @param {string} source
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 */
declare function normalizeList(source: string, sort?: boolean, convertToIs?: boolean, keyframe?: boolean, hasDefaultNamespace?: boolean): string;
/** @param {string} source */
declare function specificityOf(source: string): string;
export { normalizeList, specificityOf };
//# sourceMappingURL=selectorScanner.d.ts.map