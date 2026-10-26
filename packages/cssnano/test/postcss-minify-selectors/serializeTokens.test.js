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

test('serializeNormalizedTokens returns no tokens for exactly 3 corpus lists', () => {
  let withoutTokens = 0;
  for (const [input] of serializerCorpus) {
    const { arena, root } = normalizedRoot(input);
    if (serializeNormalizedTokens(arena, root).tokens === undefined)
      withoutTokens++;
  }
  assert.equal(withoutTokens, 3);
});

/** Counts the text and source emits of a tree that carry no tokens. */
function emitsWithoutTokens(emit) {
  if (emit === undefined || emit.kind === 'node') return 0;
  if (emit.kind === 'sequence')
    return emit.items.reduce((sum, item) => sum + emitsWithoutTokens(item), 0);
  return emit.tokens === undefined ? 1 : 0;
}

test('the serializer corpus has exactly 22 emits without tokens', () => {
  let count = 0;
  for (const [input] of serializerCorpus)
    count += emitsWithoutTokens(normalizedRoot(input).root);
  assert.equal(count, 22);
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

test("normalizeListTrivia's comment emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    for (const emit of textEmits(root, '/*! keep */'))
      assert.notEqual(emit.tokens, undefined, input);
  }
});

test("normalizeListTrivia's space emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    for (const emit of textEmits(root, ' '))
      assert.notEqual(emit.tokens, undefined, input);
  }
});

test("normalizePseudo.js's name emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    const emits = [
      ...textEmitsWithPrefix(root, ':'),
      ...textEmits(root, 'odd'),
    ];
    for (const emit of emits)
      if (emit.tokens === undefined) assert.fail(`${input}: ${emit.value}`);
  }
});

const pieceGrammars = new Set([
  'ident',
  'ident-list',
  'ident-or-string-list',
  'pt-name-selector',
]);

/** The argument text emits of a tree: the text between a pseudo's head and its `)`. */
function argumentEmits(emit) {
  if (emit === undefined || emit.kind !== 'sequence') return [];
  const [, argument, close] = emit.items;
  const found =
    emit.items.length === 3 &&
    argument?.kind === 'text' &&
    close?.kind === 'text' &&
    close.value === ')'
      ? [argument]
      : [];
  return [...found, ...emit.items.flatMap(argumentEmits)];
}

/** The argument emits of the corpus lists whose pseudos take a piece grammar. */
function pieceArgumentLists() {
  const lists = [];
  for (const [input] of serializerCorpus) {
    const { arena, root } = normalizedRoot(input);
    if (
      arena.payloads.pseudos.some((p) => pieceGrammars.has(p.argumentGrammar))
    )
      lists.push({ input, emits: argumentEmits(root) });
  }
  return lists;
}

/** Token fields without positions, which a list's tokens hold until it is serialized. */
function withoutPositions(list) {
  return list.map((token) => [token[0], token[1], token[4]]);
}

test('piece argument emits carry tokens', () => {
  const lists = pieceArgumentLists();
  assert.equal(lists.length, 9);
  for (const { input, emits } of lists) {
    assert.notEqual(emits.length, 0, input);
    for (const emit of emits) assert.notEqual(emit.tokens, undefined, input);
  }
});

test("piece argument emits' tokens spell their text", () => {
  for (const { input, emits } of pieceArgumentLists())
    for (const emit of emits)
      if (emit.tokens !== undefined)
        assert.deepEqual(
          withoutPositions(emit.tokens),
          withoutPositions(tokens(emit.value)),
          input
        );
});

test("normalizeNode's class and ID emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    for (const prefix of ['.', '#'])
      for (const emit of textEmitsWithPrefix(root, prefix))
        assert.notEqual(emit.tokens, undefined, input);
  }
});

test("normalizeNode's combinator emits carry tokens", () => {
  for (const [input] of serializerCorpus) {
    const { root } = normalizedRoot(input);
    for (const value of ['>', '||'])
      for (const emit of textEmits(root, value))
        assert.notEqual(emit.tokens, undefined, input);
  }
});

test("normalizeNode's keyframe emits carry tokens", () => {
  const arena = parseSelectorArena('from, 100%', {
    keyframe: true,
    verifyArena: false,
  });
  const root = normalizeArena(arena, { sort: true, keyframe: true });
  const emits = [...textEmits(root, '0%'), ...textEmits(root, 'to')];
  assert.equal(emits.length, 2);
  for (const emit of emits) assert.notEqual(emit.tokens, undefined, emit.value);
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

/** The text emits of a tree whose value starts with `prefix`. */
function textEmitsWithPrefix(emit, prefix) {
  if (emit === undefined || emit.kind === 'node') return [];
  if (emit.kind === 'sequence')
    return emit.items.flatMap((item) => textEmitsWithPrefix(item, prefix));
  return emit.kind === 'text' &&
    emit.value.length > 1 &&
    emit.value.startsWith(prefix)
    ? [emit]
    : [];
}

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
