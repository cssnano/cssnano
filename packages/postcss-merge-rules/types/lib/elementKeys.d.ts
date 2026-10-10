/**
 * The key of one selector, as `RuleMeta#elementKeys` lists it, or null when a
 * type name cannot describe its element, as with classes, pseudo-classes and
 * escapes. Two different names cannot match one element.
 *
 * @param {string} selector
 * @return {string | null}
 */
export declare function elementKeyOf(selector: string): string | null;
/**
 * A memoized `elementKeyOf`, so each distinct selector is tokenized once per
 * stylesheet, however many times its rule is described again.
 *
 * @param {Map<string, string | null>} [cache]
 * @return {(selector: string) => string | null}
 */
export declare function createElementKeyLookup(cache?: Map<string, string | null>): (selector: string) => string | null;
//# sourceMappingURL=elementKeys.d.ts.map