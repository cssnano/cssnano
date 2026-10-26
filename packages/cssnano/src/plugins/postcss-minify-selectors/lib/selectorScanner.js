import cssnanoUtils from '#utils';
import { normalizeArena } from './normalizeArena.js';
import { parseSelectorArena } from './parseArena.js';
import {
  serializeNormalized,
  serializeNormalizedTokens,
} from './serializeArena.js';

const { tokens: tokenize } = cssnanoUtils;

/**
 * Normalizes a selector list that its tokens spell, with the tokens of the
 * result. Its tokens are built from the emits where they carry them, and
 * tokenized once from the text otherwise.
 *
 * @param {string} source the text the tokens spell
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} sourceTokens
 * @param {boolean} sort
 * @param {boolean} convertToIs
 * @param {boolean} keyframe
 * @param {boolean} hasDefaultNamespace
 * @returns {{text: string, tokens: readonly import('@csstools/css-tokenizer').CSSToken[]}}
 */
export function normalizeListTokens(
  source,
  sourceTokens,
  sort,
  convertToIs,
  keyframe,
  hasDefaultNamespace
) {
  const arena = parseSelectorArena(
    source,
    { keyframe, hasDefaultNamespace, verifyArena: false },
    sourceTokens
  );
  const { text, tokens } = serializeNormalizedTokens(
    arena,
    normalizeArena(arena, {
      sort,
      convertToIs,
      keyframe,
      hasDefaultNamespace,
    })
  );
  return { text, tokens: tokens ?? tokenize(text) };
}

/**
 * @param {string} source
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 */
function normalizeList(
  source,
  sort = true,
  convertToIs = true,
  keyframe = false,
  hasDefaultNamespace = false
) {
  const arena = parseSelectorArena(source, {
    keyframe,
    hasDefaultNamespace,
    verifyArena: false,
  });
  return serializeNormalized(
    arena,
    normalizeArena(arena, {
      sort,
      convertToIs,
      keyframe,
      hasDefaultNamespace,
    })
  );
}

/** @param {string} source */
function specificityOf(source) {
  const arena = parseSelectorArena(source, { verifyArena: false });
  return (arena.nodes[0].specificity ?? [0, 0, 0]).join(',');
}

export { normalizeList, specificityOf };
