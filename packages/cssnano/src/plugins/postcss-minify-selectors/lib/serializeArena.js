import cssnanoUtils from '#utils';
import { renumber } from '../../../values/renumber.js';
import { needsHexEscapeTerminator } from './hexEscape.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { TokenType, isCSSWhitespace, tokenStart } = cssnanoUtils;
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./outputOverlay.js').Emit} Emit */

/** @param {SelectorArena} arena @param {number} tokenIndex */
function sourceOffset(arena, tokenIndex) {
  if (tokenIndex === arena.tokens.length) return arena.source.length;
  const token = arena.tokens[tokenIndex];
  if (!token) {
    if (tokenIndex === 0) return 0;
    throw new RangeError('source emission has an invalid token boundary');
  }
  return tokenStart(token) - arena.base;
}

/**
 * Appends the tokens of one emit. A node emit contributes its arena tokens in
 * place; an emit without tokens appends `undefined`, so the caller returns no
 * tokens for the selector.
 * @param {(CSSToken | undefined)[]} list
 * @param {SelectorArena} arena
 * @param {Emit} emit
 */
function appendEmitTokens(list, arena, emit) {
  if (emit.kind === 'node') {
    const node = arena.nodes[emit.node];
    for (let index = node.startToken; index < node.endToken; index++)
      list.push(arena.tokens[index]);
  } else if (emit.kind !== 'sequence' && emit.tokens !== undefined) {
    for (const token of emit.tokens) list.push(token);
  } else list.push(undefined);
}

/**
 * The tokenizer keeps a hex escape's terminator in the escape's ident or hash,
 * so a terminator restored before whitespace joins that token's text. Before a
 * hex digit the next emit would continue the ident, which no joined token list
 * can spell.
 * @param {(CSSToken | undefined)[]} list
 * @param {string} next
 */
export function appendTerminator(list, next) {
  const last = list.at(-1);
  if (
    last !== undefined &&
    (last[0] === TokenType.Ident || last[0] === TokenType.Hash) &&
    isCSSWhitespace(next.charCodeAt(0))
  ) {
    list[list.length - 1] = /** @type {CSSToken} */ ([
      last[0],
      `${last[1]} `,
      last[2],
      last[3],
      last[4],
    ]);
  } else list.push(undefined);
}

/**
 * The tokens that spell `joinPieces(pieces)`, joined as `serializeNormalized`
 * joins emits. A piece without a token, or a restored terminator no token can
 * hold, makes the result undefined.
 * @param {readonly string[]} pieces
 * @param {readonly (CSSToken | undefined)[]} tokens the token of each piece
 * @return {readonly CSSToken[] | undefined}
 */
export function joinPieceTokens(pieces, tokens) {
  /** @type {(CSSToken | undefined)[]} */ const list = [];
  let previous = '';
  for (let index = 0; index < pieces.length; index++) {
    const piece = pieces[index];
    if (piece === '') continue;
    if (needsHexEscapeTerminator(previous, piece))
      appendTerminator(list, piece);
    list.push(tokens[index]);
    previous = piece;
  }
  if (list.includes(undefined)) return undefined;
  return Object.freeze(/** @type {CSSToken[]} */ (list));
}

/**
 * Walks the emit tree in order and returns its text. With a `list`, it also
 * collects the emits' tokens, and `undefined` for each emit without tokens and
 * each restored terminator no token can hold.
 * @param {SelectorArena} arena
 * @param {Emit} root
 * @param {(CSSToken | undefined)[] | undefined} list
 */
function serializeEmits(arena, root, list) {
  /** @type {Emit[]} */ const work = [root];
  /** @type {string[]} */ const output = [];
  let previous = '';
  while (work.length > 0) {
    const emit = work.pop();
    if (!emit) break;
    let value;
    if (emit.kind === 'text') value = emit.value;
    else if (emit.kind === 'source')
      value = arena.source.slice(emit.start, emit.end);
    else if (emit.kind === 'node') {
      const node = arena.nodes[emit.node];
      if (!node)
        throw new RangeError('emission references an unknown arena node');
      value = arena.source.slice(
        sourceOffset(arena, node.startToken),
        sourceOffset(arena, node.endToken)
      );
    } else {
      for (let index = emit.items.length - 1; index >= 0; index--)
        work.push(emit.items[index]);
      continue;
    }
    if (value === '') continue;
    if (needsHexEscapeTerminator(previous, value)) {
      output.push(' ');
      if (list !== undefined) appendTerminator(list, value);
    }
    output.push(value);
    if (list !== undefined) appendEmitTokens(list, arena, emit);
    previous = value;
  }
  return output.join('');
}

/**
 * The arena's tokens positioned as `arena.source`. A range's tokens keep their
 * positions in the parent text, so they are renumbered from 0 when the arena
 * starts later.
 * @param {SelectorArena} arena
 * @return {readonly CSSToken[]}
 */
function sourceTokens(arena) {
  if (arena.base === 0) return arena.tokens;
  const list = arena.tokens.slice();
  renumber(list);
  return list;
}

/**
 * Serialize trusted normalizer output, where node emissions always mean an
 * unchanged source-backed subtree. Joining restores hex escape terminators that
 * text emits omit, judged from the bytes that actually follow (see
 * `needsHexEscapeTerminator`).
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 */
export function serializeNormalized(arena, root) {
  if (root === undefined) return arena.source;
  return serializeEmits(arena, root, undefined);
}

/**
 * The same text as `serializeNormalized`, with its tokens. The tokens are
 * undefined when an emit carries none, so no fragment is tokenized out of
 * context.
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 * @return {{text: string, tokens: readonly CSSToken[] | undefined}}
 */
export function serializeNormalizedTokens(arena, root) {
  if (root === undefined)
    return { text: arena.source, tokens: sourceTokens(arena) };
  /** @type {(CSSToken | undefined)[]} */ const list = [];
  const text = serializeEmits(arena, root, list);
  if (list.includes(undefined)) return { text, tokens: undefined };
  const tokens = /** @type {CSSToken[]} */ (list);
  renumber(tokens);
  return { text, tokens };
}
