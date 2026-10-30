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
//# sourceMappingURL=elementKeys.d.ts.map