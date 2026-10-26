import cssnanoUtils from '#utils';
import {
  closeParen,
  closeSquare,
  colon,
  comma,
  delim,
  openSquare,
  whitespace,
} from '../../../values/punctuationTokens.js';
import {
  func,
  hashWithText,
  ident,
  identifierWithText,
  percentage,
  stringToken,
} from '../../../values/tokenConstructors.js';
import { dropHexEscapeTerminator } from './hexEscape.js';

const { TokenType } = cssnanoUtils;

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
  ['[', Object.freeze([openSquare()])],
  [']', Object.freeze([closeSquare()])],
  ['=', Object.freeze([delim('=')])],
  ['~=', Object.freeze([delim('~'), delim('=')])],
  ['|=', Object.freeze([delim('|'), delim('=')])],
  ['^=', Object.freeze([delim('^'), delim('=')])],
  ['$=', Object.freeze([delim('$'), delim('=')])],
  ['*=', Object.freeze([delim('*'), delim('=')])],
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

/**
 * The token of a name: its source token while the text is unchanged, or else
 * an identifier that spells the text. Only a dropped hex escape terminator
 * changes an identifier's text.
 * @param {CSSToken} token
 * @param {string} text the name's serialized text
 * @return {CSSToken}
 */
export function nameToken(token, text) {
  if (text === token[1]) return token;
  const { value } = /** @type {{value: string}} */ (token[4]);
  return identifierWithText(text, value);
}

/**
 * The tokens of a namespace prefix, which spell `|`, `*|` or `ns|`.
 * @param {SelectorArena} arena
 * @param {import('./arena.js').AttributePayload['namespace']} namespace
 * @return {CSSToken[]}
 */
export function namespaceTokens(arena, namespace) {
  if (namespace.kind === 'empty') return [delim('|')];
  if (namespace.kind === 'wildcard') return [delim('*'), delim('|')];
  if (namespace.kind === 'named') {
    const token = arena.tokens[namespace.token];
    return [nameToken(token, dropHexEscapeTerminator(token[1])), delim('|')];
  }
  return [];
}

/**
 * The token of an attribute value as serialized. An identifier keeps its
 * token. A string keeps its token while its text is unchanged; a value that
 * was unquoted is an identifier, and a quoted value whose text changed is a
 * string with the same decoded value.
 * @param {CSSToken} token the source value token
 * @param {string} text the serialized value
 * @return {CSSToken | undefined}
 */
export function attributeValueToken(token, text) {
  if (token[0] === TokenType.Ident) return nameToken(token, text);
  if (text === token[1]) return token;
  if (token[0] !== TokenType.String) return undefined;
  if (text[0] === '"' || text[0] === "'") {
    const { value } = /** @type {{value: string}} */ (token[4]);
    return stringToken(text, value);
  }
  return ident(text);
}
