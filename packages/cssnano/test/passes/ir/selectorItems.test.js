import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { selectorItemsOf } from '../../../src/passes/ir/selectorItems.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { tokensText } from '../../../src/values/tokensText.js';
import { tokens as tokenize } from '../../../src/utils/value.js';

/**
 * The items of a selector as written, from its text.
 *
 * @param {string} text
 * @return {string[]}
 */
function itemsOf(text) {
  return selectorItemsOf(tokenize(text));
}

describe('the items of a selector split at its top-level commas', () => {
  test('a selector with two items gives each item', () => {
    assert.deepEqual(itemsOf('a,b'), ['a', 'b']);
  });

  test('a comma inside a kept comment does not split the item', () => {
    assert.deepEqual(itemsOf('a/*!,*/b'), ['a/*!,*/b']);
  });

  test('a comma inside a comment between two items does not split either item', () => {
    assert.deepEqual(itemsOf('a/*x,y*/b, c'), ['a/*x,y*/b', 'c']);
  });

  test('a comma inside parentheses does not split the item', () => {
    assert.deepEqual(itemsOf(':is(a,b), c'), [':is(a,b)', 'c']);
  });

  test('a comma inside an attribute string does not split the item', () => {
    assert.deepEqual(itemsOf('[title="a,b"], c'), ['[title="a,b"]', 'c']);
  });

  test('an escaped comma does not split the item', () => {
    assert.deepEqual(itemsOf('a\\,b, c'), ['a\\,b', 'c']);
  });

  test('whitespace around each item is trimmed', () => {
    assert.deepEqual(itemsOf(' a ,  b '), ['a', 'b']);
  });

  test('a trailing comma keeps an empty last item, as PostCSS does', () => {
    assert.deepEqual(itemsOf('a,'), ['a', '']);
  });

  test('a doubled comma keeps an empty item between, as PostCSS does', () => {
    assert.deepEqual(itemsOf('a,,b'), ['a', '', 'b']);
  });

  test('a leading comma keeps an empty first item, as PostCSS does', () => {
    assert.deepEqual(itemsOf(',a'), ['', 'a']);
  });

  test('an empty selector gives one empty item, as PostCSS does', () => {
    assert.deepEqual(itemsOf(''), ['']);
  });
});

describe('the build gives a rule one id per item of its written selector', () => {
  test('a comma inside a kept comment leaves the rule with one selector id', () => {
    const root = postcss.parse('a/*!,*/b{color:red}');
    const context = createRunContext(undefined, true);
    const { records } = runDriver.build(root, context);
    const rule = records.links.firstChild(records.root.index);
    const { selectorIds } = records.entry(rule);
    assert.deepEqual(
      selectorIds.map((id) => tokensText(context.tokenLists.get(id))),
      ['a/*!,*/b']
    );
  });
});
