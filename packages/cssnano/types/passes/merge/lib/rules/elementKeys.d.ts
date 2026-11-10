import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * The key of one selector, as `RuleRecord#elementKeys` lists it, or null when a
 * type name cannot describe its element, as with classes, pseudo-classes and
 * escapes. Two different names cannot match one element.
 *
 * @param {readonly CSSToken[]} tokens the tokens of one selector item
 * @return {string | null}
 */
export declare function elementKeyOf(tokens: readonly CSSToken[]): string | null;
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
 * Adds the keys of the selectors from index `from` on to `keys`.
 *
 * @param {RuleElementKeys} keys
 * @param {readonly number[]} ids the id of each selector of the list
 * @param {number} from
 * @param {(id: number) => string | null} keyOf
 * @return {boolean} false when a selector has no key, so the elements are unknown
 */
export declare function addElementKeys(keys: RuleElementKeys, ids: readonly number[], from: number, keyOf: (id: number) => string | null): boolean;
//# sourceMappingURL=elementKeys.d.ts.map