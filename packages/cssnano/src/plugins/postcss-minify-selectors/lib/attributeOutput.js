import cssnanoUtils from '#utils';
import { whitespace } from '../../../values/punctuationTokens.js';
import {
  attributeValueToken,
  nameToken,
  namespaceTokens,
} from './outputTokens.js';
import { dropHexEscapeTerminator } from './hexEscape.js';
import { importantTrivia, rawOutput } from './normalizePool.js';
import { skipTrivia, unquote } from './tokenUtils.js';

const { TokenType } = cssnanoUtils;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./normalizePool.js').Output} Output */
/** @typedef {import('./normalizePool.js').OutputPool} OutputPool */

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export function attributeOutput(arena, pool, node) {
  if (node.status !== 'valid') return rawOutput(arena, pool, node);
  const payload = arena.payloads.attributes[node.payload];
  const close = node.endToken - 1;
  let nameStart = payload.nameToken;
  let name = dropHexEscapeTerminator(arena.tokens[payload.nameToken][1]);
  if (payload.namespace.kind === 'empty') {
    nameStart--;
    name = `|${name}`;
  } else if (payload.namespace.kind === 'wildcard') {
    nameStart -= 2;
    name = `*|${name}`;
  } else if (payload.namespace.kind === 'named') {
    nameStart = payload.namespace.token;
    name = `${dropHexEscapeTerminator(
      arena.tokens[payload.namespace.token][1]
    )}|${name}`;
  }
  /** @type {Output[]} */ const values = [pool.text('[')];
  values.push(importantTrivia(arena, pool, node.startToken + 1, nameStart));
  values.push(attributeNameOutput(arena, pool, payload, name));
  let cursor = payload.nameToken + 1;
  if (!payload.matcher) {
    values.push(importantTrivia(arena, pool, cursor, close));
    values.push(pool.text(']'));
    return pool.sequence(values);
  }
  const matcherStart = skipTrivia(arena.tokens, cursor, close);
  const matcherEnd = matcherStart + payload.matcher.length;
  values.push(importantTrivia(arena, pool, cursor, matcherStart));
  values.push(pool.text(payload.matcher));
  if (payload.valueToken === undefined) return rawOutput(arena, pool, node);
  const valueToken = arena.tokens[payload.valueToken];
  let value = valueToken[1];
  if (valueToken[0] === TokenType.String)
    value = unquote(value).replaceAll('\\\n', '');
  else value = dropHexEscapeTerminator(value);
  values.push(
    importantTrivia(arena, pool, matcherEnd, payload.valueToken),
    attributeValueOutput(pool, valueToken, value)
  );
  cursor = payload.valueToken + 1;
  if (payload.modifierToken !== undefined) {
    values.push(
      importantTrivia(arena, pool, cursor, payload.modifierToken),
      modifierOutput(pool, arena.tokens[payload.modifierToken])
    );
    cursor = payload.modifierToken + 1;
  }
  values.push(importantTrivia(arena, pool, cursor, close), pool.text(']'));
  return pool.sequence(values);
}

/**
 * The attribute name with its namespace prefix. `name` is the name's
 * serialized text, prefix included.
 * @param {SelectorArena} arena
 * @param {OutputPool} pool
 * @param {import('./arena.js').AttributePayload} payload
 * @param {string} name
 * @return {Output}
 */
function attributeNameOutput(arena, pool, payload, name) {
  const nameTok = arena.tokens[payload.nameToken];
  return (
    pool.texts.get(name) ??
    pool.intern(
      name,
      Object.freeze([
        ...namespaceTokens(arena, payload.namespace),
        nameToken(nameTok, dropHexEscapeTerminator(nameTok[1])),
      ])
    )
  );
}

/**
 * The attribute value as serialized. Its tokens are built only for a text not
 * yet interned.
 * @param {OutputPool} pool
 * @param {CSSToken} token the source value token
 * @param {string} text the serialized value
 * @return {Output}
 */
function attributeValueOutput(pool, token, text) {
  const cached = pool.texts.get(text);
  if (cached) return cached;
  const valueTok = attributeValueToken(token, text);
  return pool.intern(
    text,
    valueTok === undefined ? undefined : Object.freeze([valueTok])
  );
}

/**
 * The attribute modifier with the space before it. Its tokens are built only
 * for a text not yet interned.
 * @param {OutputPool} pool
 * @param {CSSToken} token the source modifier token
 * @return {Output}
 */
function modifierOutput(pool, token) {
  const modifier = dropHexEscapeTerminator(token[1]);
  const text = ` ${modifier}`;
  return (
    pool.texts.get(text) ??
    pool.intern(text, Object.freeze([whitespace(), nameToken(token, modifier)]))
  );
}
