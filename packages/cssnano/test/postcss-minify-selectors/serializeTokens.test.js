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

test('serializeNormalizedTokens returns no tokens for exactly 7 corpus lists', () => {
  let withoutTokens = 0;
  for (const [input] of serializerCorpus) {
    const { arena, root } = normalizedRoot(input);
    if (serializeNormalizedTokens(arena, root).tokens === undefined)
      withoutTokens++;
  }
  assert.equal(withoutTokens, 7);
});

/** Counts the text and source emits of a tree that carry no tokens. */
function emitsWithoutTokens(emit) {
  if (emit === undefined || emit.kind === 'node') return 0;
  if (emit.kind === 'sequence')
    return emit.items.reduce((sum, item) => sum + emitsWithoutTokens(item), 0);
  return emit.tokens === undefined ? 1 : 0;
}

test('the serializer corpus has exactly 29 emits without tokens', () => {
  let count = 0;
  for (const [input] of serializerCorpus)
    count += emitsWithoutTokens(normalizedRoot(input).root);
  assert.equal(count, 29);
});

test("normalizeList's emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    for (const emit of textEmits(root, ','))
      assert.notEqual(emit.tokens, undefined, input);
  }
});

test("normalizeFoldWork's emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    for (const emit of [...textEmits(root, ':is('), ...textEmits(root, ')')])
      if (emit.tokens === undefined) assert.fail(`${input}: ${emit.value}`);
  }
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

/** The text emits of a tree whose value is `value`. */
function textEmits(emit, value) {
  if (emit === undefined || emit.kind === 'node') return [];
  if (emit.kind === 'sequence')
    return emit.items.flatMap((item) => textEmits(item, value));
  return emit.kind === 'text' && emit.value === value ? [emit] : [];
}

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

test('serializeNormalizedTokens folds a hex escape terminator restored before whitespace into the preceding ident', () => {
  // The tokenizer keeps the terminator in the escape's ident, `\31 `, and
  // reads the descendant combinator after it as whitespace.
  const arena = parseSelectorArena('.a', { verifyArena: false });
  const root = {
    kind: 'sequence',
    items: [
      { kind: 'text', value: '.\\31', tokens: tokens('.\\31') },
      { kind: 'text', value: ' .b', tokens: tokens(' .b') },
    ],
  };
  const { text, tokens: list } = serializeNormalizedTokens(arena, root);
  assert.equal(text, '.\\31  .b');
  assert.deepEqual(list, tokens(text));
});

test('serializeNormalizedTokens folds a hex escape terminator restored before whitespace into the preceding hash', () => {
  const arena = parseSelectorArena('.a', { verifyArena: false });
  const root = {
    kind: 'sequence',
    items: [
      { kind: 'text', value: '#\\31', tokens: tokens('#\\31') },
      { kind: 'text', value: ' a', tokens: tokens(' a') },
    ],
  };
  const { text, tokens: list } = serializeNormalizedTokens(arena, root);
  assert.equal(text, '#\\31  a');
  assert.deepEqual(list, tokens(text));
});

test('serializeNormalizedTokens returns no tokens when a restored hex escape terminator joins two emits into one ident', () => {
  // `\31 a` is one ident, so the tokens of the two emits cannot spell it.
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
