import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TokenType,
  applyEdits,
  balancedTokens,
  decoded,
  numeric,
  numericSource,
  tokenEnd,
  tokens,
} from '../src/value.js';

test('keeps raw spellings separate from decoded token values', () => {
  const [identifier] = tokens('v\\61 r');
  assert.equal(identifier[1], 'v\\61 r');
  assert.equal(decoded(identifier), 'var');
});

test('reports numeric facts with exclusive source bounds', () => {
  const input = tokens('  -0.5PX 25% 1.em');
  const first = numericSource(input, 1);
  const percentage = numeric(input[3]);
  const malformed = numericSource(input, 5);
  assert.deepEqual(first, {
    index: 1,
    start: 2,
    end: 8,
    raw: '-0.5PX',
    number: -0.5,
    unit: 'PX',
    hasDecimal: true,
  });
  assert.deepEqual(percentage, { number: 25, unit: '%' });
  assert.equal(malformed?.raw, '1.em');
  assert.equal(malformed?.end, 17);
});

test('applies unordered disjoint edits', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 4, end: 6, text: 'Z' },
      { start: 0, end: 2, text: 'X' },
    ]),
    'XcdZ'
  );
});

test('applies adjacent exclusive-end edits', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 3, text: 'X' },
      { start: 3, end: 5, text: 'Y' },
    ]),
    'aXYf'
  );
});

test('preserves same-offset insertion order', () => {
  assert.equal(
    applyEdits('abcd', [
      { start: 2, end: 2, text: 'x' },
      { start: 2, end: 2, text: 'y' },
    ]),
    'abxycd'
  );
});

test('allows insertions at replacement boundaries', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 4, text: 'X' },
      { start: 1, end: 1, text: '[' },
      { start: 4, end: 4, text: ']' },
    ]),
    'a[X]ef'
  );
});

test('rejects an insertion strictly inside a replacement', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 5, text: 'X' },
      { start: 3, end: 3, text: '!' },
    ]),
    'abcdef'
  );
});

test('rejects overlapping replacements in either order', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 4, text: 'X' },
      { start: 3, end: 5, text: 'Y' },
    ]),
    'abcdef'
  );
  assert.equal(
    applyEdits('abcdef', [
      { start: 3, end: 5, text: 'Y' },
      { start: 1, end: 4, text: 'X' },
    ]),
    'abcdef'
  );
});

test('does not resolve overlapping replacements using priority metadata', () => {
  const editWithLegacyMetadata = {
    start: 1,
    end: 5,
    text: '',
    priority: 1,
  };
  assert.equal(
    applyEdits('abcdef', [
      { start: 2, end: 4, text: 'X' },
      editWithLegacyMetadata,
    ]),
    'abcdef'
  );
});

test('rejects invalid source bounds', () => {
  for (const edit of [
    { start: -1, end: 1, text: 'X' },
    { start: 1.5, end: 2, text: 'X' },
    { start: 2, end: 1, text: 'X' },
    { start: 1, end: 2.5, text: 'X' },
    { start: 1, end: 7, text: 'X' },
  ]) {
    assert.equal(applyEdits('abcdef', [edit]), 'abcdef');
  }
});

test('accepts a large disjoint edit set', () => {
  const source = 'a'.repeat(10_000);
  assert.equal(
    applyEdits(
      source,
      Array.from({ length: 5_000 }, (_, index) => ({
        start: index * 2,
        end: index * 2 + 1,
        text: 'b',
      }))
    ),
    'ba'.repeat(5_000)
  );
});

test('indexes nested mixed blocks and top-level token ranges', () => {
  const structure = balancedTokens('a, fn(x, [y,z]), b');
  assert.ok(structure);
  const { tokens: input } = structure;
  const functionOpening = input.findIndex(
    (token) => token[0] === TokenType.Function
  );
  const squareOpening = input.findIndex(
    (token) => token[0] === TokenType.OpenSquare
  );
  const squareClosing = input.findIndex(
    (token) => token[0] === TokenType.CloseSquare
  );
  const functionClosing = input.findIndex(
    (token) => token[0] === TokenType.CloseParen
  );

  assert.equal(structure.endForOpening(functionOpening), functionClosing);
  assert.equal(structure.endForOpening(squareOpening), squareClosing);
  assert.equal(structure.endForOpening(squareClosing), undefined);
  assert.equal(structure.endForOpening(functionClosing), undefined);

  const segments = structure.topLevelSegments();
  assert.deepEqual(
    segments.map(({ startIndex, endIndex }) =>
      input
        .slice(startIndex, endIndex)
        .map((token) => token[1])
        .join('')
    ),
    ['a', ' fn(x, [y,z])', ' b']
  );
  assert.equal(tokenEnd(input.at(-1)), 18);
});

test('uses explicit bounds and custom delimiters', () => {
  const structure = balancedTokens('a/b,fn(c/d),e/f');
  assert.ok(structure);
  assert.deepEqual(structure.topLevelSegments(0, 4, TokenType.Delim), [
    { startIndex: 0, endIndex: 1 },
    { startIndex: 2, endIndex: 4 },
  ]);
  assert.deepEqual(structure.topLevelSegments(0, structure.tokens.length), [
    { startIndex: 0, endIndex: 3 },
    { startIndex: 4, endIndex: 9 },
    { startIndex: 10, endIndex: 13 },
  ]);
});

test('omits EOF and fails closed for malformed token streams', () => {
  const structure = balancedTokens('a(/* comment */');
  assert.equal(structure, undefined);
  assert.equal(balancedTokens('a]'), undefined);
  assert.deepEqual(
    balancedTokens('/* comment */')?.tokens.map((token) => token[0]),
    [TokenType.Comment]
  );
  assert.equal(tokens('/* comment */')[0][0], TokenType.Comment);
});
