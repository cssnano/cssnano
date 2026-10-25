import cssnanoUtils from '#utils';
import { renumber } from '../../../values/renumber.js';
import { needsHexEscapeTerminator } from './hexEscape.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { tokenStart } = cssnanoUtils;
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
  return tokenStart(token);
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
 * Walks the emit tree in order and returns its text. With a `list`, it also
 * collects the emits' tokens, and `undefined` for each emit without tokens and
 * each restored terminator.
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
      // The tokenizer reads the terminator as part of the escape's ident, so
      // no whitespace token can stand for it.
      output.push(' ');
      if (list !== undefined) list.push(undefined);
    }
    output.push(value);
    if (list !== undefined) appendEmitTokens(list, arena, emit);
    previous = value;
  }
  return output.join('');
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
  if (root === undefined) return { text: arena.source, tokens: arena.tokens };
  /** @type {(CSSToken | undefined)[]} */ const list = [];
  const text = serializeEmits(arena, root, list);
  if (list.includes(undefined)) return { text, tokens: undefined };
  const tokens = /** @type {CSSToken[]} */ (list);
  renumber(tokens);
  return { text, tokens };
}
