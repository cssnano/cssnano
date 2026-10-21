/**
 * An unknown browserslist key throws rather than being reported, because
 * ignoring it would change the browser targets that the user asked for.
 * @param {Record<string, unknown>} browserslist
 * @returns {Record<string, unknown>}
 */
export declare function validateBrowserslist(browserslist: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=browserslistOptions.d.ts.map