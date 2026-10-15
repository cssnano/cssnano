/**
 * Whether a string is a dotted numeric release such as "26" or "26.6". Words
 * such as "TP" and ranges such as "18.5-18.7" are not.
 * @param {string} version
 * @return {boolean}
 */
export declare function isDottedVersion(version: string): boolean;
/**
 * Orders dotted release numbers such as browser versions, numerically per
 * component, so that 10.1 follows 9.3. Callers pass dotted versions only.
 * @param {string} left
 * @param {string} right
 * @return {number} negative, zero or positive as left is older, equal or newer
 */
export declare function compareVersions(left: string, right: string): number;
//# sourceMappingURL=versions.d.ts.map