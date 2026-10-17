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
/**
 * Where the browser of a browserslist entry such as "safari 26.5" ends. The
 * browser is `entry.slice(0, separator)` and the version, which may be a
 * range such as "18.5-18.7" or a word such as "TP", is
 * `entry.slice(separator + 1)`. An entry without a version ends at its
 * length, so its version is empty.
 * @param {string} entry
 * @return {number}
 */
export declare function versionSeparator(entry: string): number;
/**
 * The browser of a browserslist entry such as "safari 26.5", or the whole
 * entry when it names no version.
 * @param {string} entry
 * @return {string}
 */
export declare function browserName(entry: string): string;
//# sourceMappingURL=versions.d.ts.map