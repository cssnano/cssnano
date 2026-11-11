/**
 * Whether a declaration carries a browser hack. The merge pass's longhand
 * transform uses it to keep hacked declarations out of shorthands, because the
 * hack is invalid for every browser that cssnano supports.
 *
 * @param {string | undefined} before the raw text before the declaration
 * @param {string} prop
 * @param {string} value
 * @return {boolean}
 */
export declare function hasHack(before: string | undefined, prop: string, value: string): boolean;
//# sourceMappingURL=index.d.ts.map