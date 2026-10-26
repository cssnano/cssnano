import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { tokens } from '../../src/utils/value.js';
import { TokenType } from '@csstools/css-tokenizer';
import {
  selectorPieces,
  selectorRanges,
  separatorOf,
} from '../../src/values/selectorRanges.js';
import { tokensText } from '../../src/values/tokensText.js';

/** The text a range spells, without its comment tokens. */
function spelledText(list, { start, end }) {
  let text = '';
  for (let index = start; index < end; index++)
    if (list[index][0] !== TokenType.Comment) text += list[index][1];
  return text;
}

/** The selectors of a rule as written, with the tokens that spell them. */
function ruleTokens(selector) {
  const rule = postcss.parse(`${selector} {}`).first;
  const written = rule.raws.selector?.raw ?? rule.selector;
  return { selectors: rule.selectors, list: tokens(written) };
}

const lists = [
  '.a, .b',
  '.a /*! keep */, .b',
  '.a /* c */ .b, x',
  '.a,',
  '.a,,.b',
  '[title="a,b"], .c',
  ':is(.a, .b) , c',
  ':not(.a,.b)',
  "'a,b' .x, y",
  '.a\\,b, .c',
  '.a[attr=","], .d',
  '.x, /*! k */ .y',
];

test("selector ranges of a rule's tokens spell `rule.selectors`", () => {
  for (const selector of lists) {
    const { selectors, list } = ruleTokens(selector);
    const ranges = selectorRanges(list);
    assert.equal(ranges.length, selectors.length, selector);
    for (const [index, range] of ranges.entries())
      assert.equal(spelledText(list, range), selectors[index], selector);
  }
});

test('a selector range starts and ends at a token that is not whitespace or a comment', () => {
  for (const selector of lists) {
    const { list } = ruleTokens(selector);
    for (const { start, end } of selectorRanges(list)) {
      if (start === end) continue;
      for (const token of [list[start], list[end - 1]]) {
        assert.notEqual(token[0], TokenType.Whitespace, selector);
        assert.notEqual(token[0], TokenType.Comment, selector);
      }
    }
  }
});

test('selectorPieces gives each selector its range in the list when the ranges spell its text', () => {
  const list = tokens('.a, .b /* c */ .d');
  const pieces = selectorPieces(list, ['.a', '.b /* c */ .d']);
  assert.deepEqual(
    pieces.map(({ start, end }) => tokensText(list.slice(start, end))),
    ['.a', '.b /* c */ .d']
  );
});

test('selectorPieces gives null when a selector keeps a comment that its range trims', () => {
  const list = tokens('/* c */ .a, .b');
  assert.equal(selectorPieces(list, ['/* c */ .a', '.b']), null);
});

test('selectorPieces gives null when the ranges and the selectors differ in number', () => {
  const list = tokens('.a, .b');
  assert.equal(selectorPieces(list, ['.a']), null);
});

test('separatorOf gives the comma and the whitespace after the first comma, as PostCSS joins selectors', () => {
  const list = tokens('.a,\n  .b, .c');
  assert.equal(tokensText(separatorOf(list)), ',\n  ');
});

test('separatorOf gives a bare comma when no whitespace follows the first comma', () => {
  assert.equal(tokensText(separatorOf(tokens('.a,.b'))), ',');
});
