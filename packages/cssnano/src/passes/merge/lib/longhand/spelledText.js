import { joinRanges } from '../../../../values/joinRanges.js';
import { comma, whitespace } from '../../../../values/punctuationTokens.js';
import { tokensText } from '../../../../values/tokensText.js';
import cssnanoUtils from '#utils';

const { tokenEnd, tokenStart } = cssnanoUtils;

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
 * The component's text, and the component itself as its range of the value's
 * tokens.
 *
 * @param {Component} component
 * @return {Spelled}
 */
export function spellComponent(component) {
  return { text: component.raw, pieces: [component] };
}

/**
 * A part's text as written, and its range from its first component to its
 * last, so the whitespace between them stays.
 *
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {{components: Component[], raw: string}} part
 * @return {Spelled}
 */
export function spellPart(list, part) {
  const { components } = part;
  return {
    text: part.raw,
    pieces: [
      {
        list,
        start: components[0].start,
        end: components[components.length - 1].end,
      },
    ],
  };
}

/**
 * A token of the value, spelled from the value's text.
 *
 * @param {string} value
 * @param {CSSToken} token
 * @return {Spelled}
 */
export function spellToken(value, token) {
  return {
    text: value.slice(tokenStart(token), tokenEnd(token)),
    pieces: [{ list: [token], start: 0, end: 1 }],
  };
}

/**
 * Joins reduced items with one separator, each of which is a piece of its own.
 *
 * @param {Spelled[]} items
 * @param {' ' | ','} separator
 * @return {Spelled}
 */
export function joinSpelled(items, separator) {
  const separatorPiece = {
    list: [separator === ',' ? comma() : whitespace()],
    start: 0,
    end: 1,
  };
  let text = '';
  /** @type {RangePiece[]} */
  const pieces = [];
  for (const [index, item] of items.entries()) {
    if (index > 0) {
      pieces.push(separatorPiece);
      text += separator;
    }
    for (const piece of item.pieces) pieces.push(piece);
    text += item.text;
  }
  return { text, pieces };
}

/**
 * The text a reduced value folds to, with the token list that spells it. The
 * list is undefined when the ranges do not spell the text, as with a part's
 * trimmed raw.
 *
 * @param {Spelled} spelled
 * @return {{text: string, tokens: CSSToken[] | undefined}}
 */
export function spelledList(spelled) {
  const tokens = joinRanges(spelled.pieces, []);
  return {
    text: spelled.text,
    tokens: tokensText(tokens) === spelled.text ? tokens : undefined,
  };
}
