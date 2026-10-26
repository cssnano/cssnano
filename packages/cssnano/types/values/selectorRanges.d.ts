import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorRange = {
    start: number;
    end: number;
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * The token index range of one selector: `end` is exclusive.
 *
 * @typedef {{start: number, end: number}} SelectorRange
 */
/**
 * Splits a rule's selector tokens at the commas that split `rule.selectors`,
 * giving each selector the range it spells. Commas inside functions and
 * parentheses do not split, and whitespace and comments at a selector's ends
 * are not part of it. Empty selectors are kept, as PostCSS keeps them. No
 * token is copied.
 *
 * @param {readonly CSSToken[]} list
 * @return {SelectorRange[]}
 */
export declare function selectorRanges(list: readonly CSSToken[]): SelectorRange[];
//# sourceMappingURL=selectorRanges.d.ts.map