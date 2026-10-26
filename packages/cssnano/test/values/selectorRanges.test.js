import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { tokens } from '../../src/utils/value.js';
import { TokenType } from '@csstools/css-tokenizer';
import { selectorRanges } from '../../src/values/selectorRanges.js';

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
