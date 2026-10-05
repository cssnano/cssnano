export type SelectorInfo = {
    compatible: boolean;
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * Looks up selectors in a cache that is shared by every check, so each
 * distinct selector is scanned once per stylesheet.
 *
 * @param {string[] | undefined} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @return {(selector: string) => SelectorInfo}
 */
export declare function createSelectorLookup(browsers: string[] | undefined, cache?: Map<string, SelectorInfo>): (selector: string) => SelectorInfo;
/**
 * @param {string[]} selectors
 * @param {(selector: string) => SelectorInfo} lookup
 * @return {boolean}
 */
export declare function selectorsCompatible(selectors: string[], lookup: (selector: string) => SelectorInfo): boolean;
//# sourceMappingURL=ensureCompatibility.d.ts.map