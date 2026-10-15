declare const cssSel2 = "css-sel2";
declare const cssSel3 = "css-sel3";
/**
 * `browsers` is the same array reference for an entire file's processing, so
 * keying on it directly (rather than re-serializing it per call) avoids
 * rebuilding a JSON string on every lookup, including cache hits.
 *
 * @param {string} feature
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
declare function isSupportedCached(feature: string, browsers: string[] | undefined): boolean;
export { isSupportedCached, cssSel2, cssSel3 };
//# sourceMappingURL=supportCache.d.ts.map