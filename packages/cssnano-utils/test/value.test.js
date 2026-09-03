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

test('applies adjacent exclusive-end edits and rejects overlap', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 3, text: 'X' },
      { start: 3, end: 5, text: 'Y' },
    ]),
    'aXYf'
  );
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 4, text: 'X' },
      { start: 3, end: 5, text: 'Y' },
    ]),
    'abcdef'
  );
});

test('rejects an insertion inside a replacement', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 4, text: 'X' },
      { start: 2, end: 2, text: '!' },
    ]),
    'abcdef'
  );
});

test('allows a higher-priority edit to supersede an overlapping edit', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 2, end: 4, text: 'X' },
      { start: 1, end: 5, text: '', priority: 1 },
    ]),
    'af'
  );
});

test('allows a higher-priority insertion inside a lower-priority replacement', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 1, end: 5, text: 'X' },
      { start: 3, end: 3, text: '!', priority: 1 },
    ]),
    'abc!def'
  );
});

test('prefers the highest-priority edit among overlapping accepted edits', () => {
  assert.equal(
    applyEdits('abcdefghij', [
      { start: 5, end: 10, text: 'H', priority: 1 },
      { start: 0, end: 5, text: 'L', priority: 0 },
      { start: 0, end: 9, text: 'C', priority: 0 },
    ]),
    'LH'
  );
});

test('preserves ordered insertions and accepts a large disjoint edit set', () => {
  assert.equal(
    applyEdits('abcd', [
      { start: 2, end: 2, text: 'x' },
      { start: 2, end: 2, text: 'y' },
      { start: 2, end: 3, text: 'Z' },
    ]),
    'abxyZd'
  );
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

test('rejects equal-priority overlaps after accepting other edits', () => {
  assert.equal(
    applyEdits('abcdef', [
      { start: 0, end: 1, text: 'A', priority: 1 },
      { start: 2, end: 5, text: 'X' },
      { start: 3, end: 6, text: 'Y' },
    ]),
    'abcdef'
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
