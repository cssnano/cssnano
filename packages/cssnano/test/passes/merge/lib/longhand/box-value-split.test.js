import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { list } from 'postcss';
import { boxBrowserKeeps } from '../../../../../src/passes/merge/lib/longhand/validateBox.js';
import { componentRanges } from '../../../../../src/passes/merge/lib/longhand/componentRanges.js';
import { tokens } from '../../../../../src/utils/value.js';

/**
 * @param {string} value
 * @return {string[]} the text of each component that the token ranges name
 */
function rangeTexts(value) {
  const parts = tokens(value);
  const ranges = componentRanges(parts);
  const texts = [];
  for (let index = 0; index < ranges.length; index += 2) {
    texts.push(
      value.slice(parts[ranges[index]][2], parts[ranges[index + 1] - 1][3] + 1)
    );
  }
  return texts;
}

describe('componentRanges splits a box value where list.space splits it', () => {
  test('on escaped whitespace, which list.space keeps in one component', () => {
    assert.deepEqual(rangeTexts('a\\ b c'), list.space('a\\ b c'));
  });

  test('on nested parentheses, which keep their inner whitespace', () => {
    assert.deepEqual(
      rangeTexts('calc(1px + (2px * 3)) 4px'),
      list.space('calc(1px + (2px * 3)) 4px')
    );
  });

  test('on an unbalanced close parenthesis, which never opens a negative depth', () => {
    assert.deepEqual(rangeTexts('a) b'), list.space('a) b'));
  });

  test('on an unclosed parenthesis, which keeps the rest as one component', () => {
    assert.deepEqual(rangeTexts('calc(1px 2px'), list.space('calc(1px 2px'));
  });

  test('on a string and on brackets, where whitespace outside them splits', () => {
    assert.deepEqual(rangeTexts('"a b" [c d]'), list.space('"a b" [c d]'));
  });
});

describe('boxBrowserKeeps on values with comments', () => {
  test('takes a value with a comment through the string path, which declines it since list.space splits the comment into words', () => {
    assert.equal(boxBrowserKeeps('margin', '1px /* x */'), false);
  });

  test('types a math function whose comment the string path skips as the uncommented function', () => {
    assert.equal(boxBrowserKeeps('margin', 'calc(1px /* x */ + 2px)'), true);
  });
});
