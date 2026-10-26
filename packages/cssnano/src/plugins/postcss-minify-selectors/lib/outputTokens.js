import {
  closeParen,
  colon,
  comma,
  delim,
  whitespace,
} from '../../../values/punctuationTokens.js';
import {
  func,
  hashWithText,
  ident,
  identifierWithText,
  percentage,
} from '../../../values/tokenConstructors.js';
import { dropHexEscapeTerminator } from './hexEscape.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */

/**
 * The tokens of fixed punctuation texts. A text's tokens depend only on the
 * text, so the pool, which interns outputs by text, can attach them once.
 */
export const fixedTokens = new Map([
  [',', Object.freeze([comma()])],
  [')', Object.freeze([closeParen()])],
  [':is(', Object.freeze([colon(), func('is')])],
  [' ', Object.freeze([whitespace()])],
  ['>', Object.freeze([delim('>')])],
  ['~', Object.freeze([delim('~')])],
  ['||', Object.freeze([delim('|'), delim('|')])],
  ['0%', Object.freeze([percentage(0)])],
  ['to', Object.freeze([ident('to')])],
  ['odd', Object.freeze([ident('odd')])],
  [':first-child', Object.freeze([colon(), ident('first-child')])],
  [':first-of-type', Object.freeze([colon(), ident('first-of-type')])],
  [':last-child', Object.freeze([colon(), ident('last-child')])],
  [':last-of-type', Object.freeze([colon(), ident('last-of-type')])],
]);

/**
 * The tokens that spell a class or ID selector's text. A name keeps its
 * source tokens unless its serialized text drops a hex escape terminator.
 * @param {SelectorArena} arena
 * @param {ArenaNode} node
 * @return {readonly CSSToken[]}
 */
export function classOrIdTokens(arena, node) {
  const { tokens } = arena;
  if (node.kind === 'class') {
    const dot = tokens[node.startToken];
    const name = tokens[node.startToken + 1];
    const text = dropHexEscapeTerminator(name[1]);
    const { value } = /** @type {{value: string}} */ (name[4]);
    return Object.freeze([
      dot,
      text === name[1] ? name : identifierWithText(text, value),
    ]);
  }
  const hash = tokens[node.startToken];
  const text = dropHexEscapeTerminator(hash[1]);
  const { value, type } =
    /** @type {{value: string, type: 'id' | 'unrestricted'}} */ (hash[4]);
  return Object.freeze([
    text === hash[1] ? hash : hashWithText(text, value, type),
  ]);
}
