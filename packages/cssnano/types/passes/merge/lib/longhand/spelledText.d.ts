import type { CSSToken } from '@csstools/css-tokenizer';
import type { Component } from './valueComponents.js';
import type { RangePiece } from '../../../../values/joinRanges.js';
export type Spelled = {
    text: string;
    pieces: RangePiece[];
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Component} from './valueComponents.js' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/**
 * A reduced text, and the ranges of the value's tokens that spell it. A
 * separator between two items is a piece of its own.
 *
 * @typedef {{text: string, pieces: RangePiece[]}} Spelled
 */
/**
 * The component's text, and its range of the value's tokens.
 *
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {Component} component
 * @return {Spelled}
 */
export declare function spellComponent(list: readonly CSSToken[], component: Component): Spelled;
/**
 * A part's text as written, and its range from its first component to its
 * last, so the whitespace between them stays.
 *
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {{components: Component[], raw: string}} part
 * @return {Spelled}
 */
export declare function spellPart(list: readonly CSSToken[], part: {
    components: Component[];
    raw: string;
}): Spelled;
/**
 * A token of the value, spelled from the value's text.
 *
 * @param {string} value
 * @param {CSSToken} token
 * @return {Spelled}
 */
export declare function spellToken(value: string, token: CSSToken): Spelled;
/**
 * Joins reduced items with one separator, each of which is a piece of its own.
 *
 * @param {Spelled[]} items
 * @param {' ' | ','} separator
 * @return {Spelled}
 */
export declare function joinSpelled(items: Spelled[], separator: ' ' | ','): Spelled;
/**
 * The text a reduced value folds to, with the token list that spells it. The
 * list is undefined when the ranges do not spell the text, as with a part's
 * trimmed raw.
 *
 * @param {Spelled} spelled
 * @return {{text: string, tokens: CSSToken[] | undefined}}
 */
export declare function spelledList(spelled: Spelled): {
    text: string;
    tokens: CSSToken[] | undefined;
};
//# sourceMappingURL=spelledText.d.ts.map