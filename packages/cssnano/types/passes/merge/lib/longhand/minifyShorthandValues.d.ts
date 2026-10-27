import type { CSSToken } from '@csstools/css-tokenizer';
import type { Component } from './valueComponents.js';
import type { FoldedSelector } from '../../../../values/textTable.js';
export type TransitionSlots = {
    property: Component | null;
    duration: Component | null;
    timingFunction: Component | null;
    delay: Component | null;
};
/**
 * The shorthand value a declaration folds to, with the token list that spells
 * it. The list is built from `list`'s ranges and is undefined when those do
 * not spell the text, as with a part's trimmed raw; a value that does not
 * change gives null.
 *
 * @param {string} property
 * @param {string} value
 * @param {readonly CSSToken[]} list the tokens of `value`
 * @return {FoldedSelector | null}
 */
export declare function normalizeValue(property: string, value: string, list: readonly CSSToken[]): FoldedSelector | null;
//# sourceMappingURL=minifyShorthandValues.d.ts.map