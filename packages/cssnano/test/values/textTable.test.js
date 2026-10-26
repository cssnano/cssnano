import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { TextTable } from '../../src/values/textTable.js';
import { tokens } from '../../src/utils/value.js';

/**
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} list
 * @return {string}
 */
function spelled(list) {
  return list.map((token) => token[1]).join('');
}

/**
 * @param {string} css
 * @return {import('postcss').Rule}
 */
function firstRule(css) {
  return /** @type {import('postcss').Rule} */ (postcss.parse(css).first);
}

test("TextTable returns the stored list without tokenizing while the rule's selector is unchanged", () => {
  const rule = firstRule('a, b {}');
  const table = new TextTable();
  const first = table.tokens(rule);
  assert.equal(spelled(first), 'a, b');
  assert.equal(table.tokens(rule), first);
});

test('TextTable compares a raw selector with a comment as written', () => {
  const rule = firstRule('a, /* keep */ b {}');
  const table = new TextTable();
  const first = table.tokens(rule);
  assert.equal(spelled(first), 'a, /* keep */ b');
  assert.equal(table.tokens(rule), first);
});

test('TextTable tokenizes once after a plain rule.selector assignment', () => {
  const rule = firstRule('a {}');
  const table = new TextTable();
  table.tokens(rule);
  rule.selector = 'b';
  const next = table.tokens(rule);
  assert.equal(spelled(next), 'b');
  assert.equal(table.tokens(rule), next);
});

test('TextTable.write stores the given list itself', () => {
  const rule = firstRule('a {}');
  const table = new TextTable();
  const list = tokens('c, d');
  table.write(rule, list);
  assert.equal(rule.selector, 'c, d');
  assert.equal(table.tokens(rule), list);
});

test('TextTable.record assigns the selector only when the text differs', () => {
  const rule = firstRule('a {}');
  let assignments = 0;
  let selector = rule.selector;
  Object.defineProperty(rule, 'selector', {
    get: () => selector,
    set(value) {
      assignments++;
      selector = value;
    },
  });
  const table = new TextTable();
  table.record(rule, 'a', tokens('a'));
  assert.equal(assignments, 0);
  table.record(rule, 'b', tokens('b'));
  assert.equal(assignments, 1);
  assert.equal(selector, 'b');
});

test('TextTable.stored is undefined for a rule the table has not seen', () => {
  const rule = firstRule('a, b {}');
  const table = new TextTable();
  assert.equal(table.stored(rule), undefined);
});

test('TextTable returns the written list from stored while the rule still spells it', () => {
  const rule = firstRule('a, b {}');
  const table = new TextTable();
  const list = tokens('z, b');
  table.write(rule, list);
  assert.equal(table.stored(rule), list);
  rule.selector = 'a';
  assert.equal(table.stored(rule), undefined);
});
