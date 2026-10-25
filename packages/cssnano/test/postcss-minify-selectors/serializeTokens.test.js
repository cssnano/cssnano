import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from '#utils';
import { normalizeArena } from '../../src/plugins/postcss-minify-selectors/lib/normalizeArena.js';
import { parseSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/parseArena.js';
import {
  serializeNormalized,
  serializeNormalizedTokens,
} from '../../src/plugins/postcss-minify-selectors/lib/serializeArena.js';
import { serializerCorpus } from './serializerCorpus.js';

const { tokens } = cssnanoUtils;

/** The emit tree normalizeList serializes, for one selector list. */
function normalizedRoot(source) {
  const arena = parseSelectorArena(source, { verifyArena: false });
  return {
    arena,
    root: normalizeArena(arena, { sort: true, convertToIs: true }),
  };
}

test('serializeNormalizedTokens tokens, when returned, equal tokenize of the text for every corpus list', () => {
  for (const [input] of serializerCorpus) {
    const { arena, root } = normalizedRoot(input);
    const { text, tokens: list } = serializeNormalizedTokens(arena, root);
    if (list === undefined) continue;
    assert.deepEqual(list, tokens(text), input);
  }
});

test('serializeNormalizedTokens returns no tokens for exactly 10 corpus lists', () => {
  let withoutTokens = 0;
  for (const [input] of serializerCorpus) {
    const { arena, root } = normalizedRoot(input);
    if (serializeNormalizedTokens(arena, root).tokens === undefined)
      withoutTokens++;
  }
  assert.equal(withoutTokens, 10);
});

test('serializeNormalizedTokens text equals serializeNormalized for every corpus list', () => {
  for (const [input] of serializerCorpus) {
    const { arena, root } = normalizedRoot(input);
    assert.equal(
      serializeNormalizedTokens(arena, root).text,
      serializeNormalized(arena, root),
      input
    );
  }
});

test('serializeNormalizedTokens returns the source and its tokens without an output tree', () => {
  const arena = parseSelectorArena('.a .b', { verifyArena: false });
  assert.deepEqual(serializeNormalizedTokens(arena, undefined), {
    text: '.a .b',
    tokens: arena.tokens,
  });
});

test('serializeNormalizedTokens joins the tokens of text emits and renumbers them', () => {
  const arena = parseSelectorArena('.a', { verifyArena: false });
  const root = {
    kind: 'sequence',
    items: [
      { kind: 'text', value: '.x', tokens: tokens('.x') },
      { kind: 'text', value: '.y', tokens: tokens('.y') },
    ],
  };
  const { text, tokens: list } = serializeNormalizedTokens(arena, root);
  assert.equal(text, '.x.y');
  assert.deepEqual(list, tokens(text));
});

test('serializeNormalizedTokens returns no tokens when a restored hex escape terminator would merge into an ident', () => {
  // The tokenizer reads `\31 a` as one ident, so no token list of these two
  // emits spells the text.
  const arena = parseSelectorArena('.a', { verifyArena: false });
  const root = {
    kind: 'sequence',
    items: [
      { kind: 'text', value: '\\31', tokens: tokens('\\31') },
      { kind: 'text', value: 'a', tokens: tokens('a') },
    ],
  };
  assert.deepEqual(serializeNormalizedTokens(arena, root), {
    text: '\\31 a',
    tokens: undefined,
  });
});
