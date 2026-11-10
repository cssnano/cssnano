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
//# sourceMappingURL=elementKeys.d.ts.map