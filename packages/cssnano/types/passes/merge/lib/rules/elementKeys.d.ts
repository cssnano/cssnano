import type { RangePiece } from '../../../../values/joinRanges.js';
/**
 * The key of one selector, as `RuleRecord#elementKeys` lists it, or null when a
 * type name cannot describe its element, as with classes, pseudo-classes and
 * escapes. Two different names cannot match one element. A token range of
 * the selector, when given, gives the key without tokenizing its text.
 *
 * @param {string} selector
 * @param {RangePiece | null} [piece] the selector's tokens, which spell it
 * @return {string | null}
 */
export declare function elementKeyOf(selector: string, piece?: RangePiece | null): string | null;
/**
 * A memoized `elementKeyOf`, so each distinct selector is tokenized once per
 * stylesheet, however many times its rule is described again.
 *
 * @param {Map<string, string | null>} [cache]
 * @return {(selector: string, piece?: RangePiece | null) => string | null}
 */
export declare function createElementKeyLookup(cache?: Map<string, string | null>): (selector: string, piece?: RangePiece | null) => string | null;
export type RuleElementKeys = {
    list: string[];
    seen: Set<string>;
};
/**
 * The distinct element keys of a selector list, in order of first appearance,
 * with the same keys as a set for membership tests.
 *
 * @typedef {object} RuleElementKeys
 * @property {string[]} list
 * @property {Set<string>} seen
 */
/**
 * Adds the keys of the selectors from index `from` on to `keys`, each with its
 * token range when the rule holds one.
 *
 * @param {RuleElementKeys} keys
 * @param {string[]} selectors
 * @param {number} from
 * @param {RangePiece[] | null | undefined} pieces one per selector, or unknown
 * @param {(selector: string, piece: RangePiece | null) => string | null} keyOf
 * @return {boolean} false when a selector has no key, so the elements are unknown
 */
export declare function addElementKeys(keys: RuleElementKeys, selectors: string[], from: number, pieces: RangePiece[] | null | undefined, keyOf: (selector: string, piece: RangePiece | null) => string | null): boolean;
//# sourceMappingURL=elementKeys.d.ts.map