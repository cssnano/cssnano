import cssnanoUtils from 'cssnano-utils';
import { needsHexEscapeTerminator } from './tokenUtils.js';

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
 * Serialize trusted normalizer output, where node emissions always mean an
 * unchanged source-backed subtree. Joining restores hex escape terminators that
 * text emits omit, judged from the bytes that actually follow (see
 * `needsHexEscapeTerminator`).
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 */
export function serializeNormalized(arena, root) {
  if (root === undefined) return arena.source;
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
    if (needsHexEscapeTerminator(previous, value)) output.push(' ');
    output.push(value);
    previous = value;
  }
  return output.join('');
}
