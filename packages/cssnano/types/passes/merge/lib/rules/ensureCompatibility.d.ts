import type { SelectorList } from './selectorList.js';
import type { TextTable } from '../../../../values/textTable.js';
export declare const simpleSelectorRe: RegExp;
export type SelectorInfo = {
    compatible: boolean;
    prefix: string | undefined;
    msPlaceholder: boolean;
};
/**
 * Looks up selectors in a cache that is shared by every check, so each
 * distinct selector is scanned once per stylesheet. A lookup that names the
 * list a selector belongs to parses it from that list's tokens. Do not pass
 * it to `map`, which would give the index as the list.
 *
 * @param {readonly string[]} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @param {TextTable} [table] the tokens of the lists' selectors
 * @return {(selector: string, list?: SelectorList, index?: number) => SelectorInfo}
 */
export declare function createSelectorLookup(browsers: readonly string[], cache?: Map<string, SelectorInfo>, table?: TextTable): (selector: string, list?: SelectorList, index?: number) => SelectorInfo;
/**
 * @param {string[]} selectors
 * @param {(selector: string, list?: SelectorList, index?: number) => SelectorInfo} lookup
 * @param {SelectorList} [list] the list whose own selectors these are, when they are
 * @return {boolean}
 */
export declare function selectorsCompatible(selectors: string[], lookup: (selector: string, list?: SelectorList, index?: number) => SelectorInfo, list?: SelectorList): boolean;
//# sourceMappingURL=ensureCompatibility.d.ts.map