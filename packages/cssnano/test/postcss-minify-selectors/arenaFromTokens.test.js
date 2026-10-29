import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/parseArena.js';
import {
  TokenType,
  balancedStructure,
  tokens as tokenize,
} from '../../src/utils/value.js';

// Selectors that cover the grammar the parser reads, plus one unbalanced
// input that takes the raw path.
const selectors = [
  '',
  'a',
  'a b',
  'a > b + c ~ d',
  '.a.b#c',
  'a[href="x,y"]',
  'a[ data-x = "1" i ]',
  ':not(a, b)',
  ':is(.x,.y) > p',
  ':nth-child(2n+1 of .a)',
  '::before',
  'svg|a',
  '*|*',
  '|a',
  'a\\:b',
  '.\\31 a',
  'a /* c */ b',
  '  a  ,  b  ',
  ':where(a b, c)',
  ':has(> img)',
  'a:hover:not(:focus)',
  'a(',
];

test("parseSelectorArena builds the same arena from the selector's tokens as from its text", () => {
  for (const selector of selectors) {
    assert.deepEqual(
      parseSelectorArena(selector, {}, tokenize(selector)),
      parseSelectorArena(selector),
      selector
    );
  }
});

test("parseSelectorArena keeps the given token list as the arena's tokens", () => {
  const list = tokenize('a, b');
  assert.equal(parseSelectorArena('a, b', {}, list).tokens, list);
});

test("parseSelectorArena builds the same arena from a range as from the range's text", () => {
  const source = 'a, :not(b, c), d';
  const list = tokenize(source);
  const segments = balancedStructure(list).topLevelSegments(
    0,
    list.length,
    TokenType.Comma
  );
  for (const { startIndex, endIndex } of segments) {
    const text = list
      .slice(startIndex, endIndex)
      .map((token) => token[1])
      .join('');
    assert.deepEqual(
      relativeToText(
        parseSelectorArena(source, {}, list, startIndex, endIndex)
      ),
      relativeToText(parseSelectorArena(text)),
      text
    );
  }
});

/**
 * The arena with its token positions counted from its own text. A range keeps
 * its tokens' offsets in the parent text, and `base` records where it starts.
 */
function relativeToText(arena) {
  return {
    ...arena,
    base: 0,
    tokens: arena.tokens.map((token) => [
      token[0],
      token[1],
      token[2] - arena.base,
      token[3] - arena.base,
      token[4],
    ]),
  };
}
