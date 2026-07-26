export = normalizeUrl;
export type Options = {
    removeTrailingSlash?: boolean;
};
/**
 * @typedef {{removeTrailingSlash?: boolean}} Options
 */
/**
 * @param {string} urlString
 * @param {Options} [options]
 * @return {string}
 */
declare function normalizeUrl(urlString: string, options?: Options): string;
//# sourceMappingURL=normalize.d.ts.map