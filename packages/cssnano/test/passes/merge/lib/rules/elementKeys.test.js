import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RuleMeta } from '../../../../../src/passes/merge/lib/rules/ruleMeta.js';

// The keys of a rule's selectors, as the merge reads them.
/** @param {string[]} selectors */
const elementKeys = (selectors) => new RuleMeta(selectors, []).elementKeys();

test('element key of a type selector is its lowercase name', () => {
  assert.deepEqual(elementKeys(['H1']), ['h1']);
});

test('element key of a descendant selector is the type of its last compound', () => {
  assert.deepEqual(elementKeys(['div span']), ['span']);
});

test('element key of a child combinator selector is the type after the combinator', () => {
  assert.deepEqual(elementKeys(['div > p']), ['p']);
});

test('element key of a sibling combinator selector is the type after the combinator', () => {
  assert.deepEqual(elementKeys(['h1+p', 'h1~em']), ['p', 'em']);
});

test('element key includes the pseudo-element, so h1 and h1::before differ', () => {
  assert.deepEqual(elementKeys(['h1::before']), ['h1::before']);
});

test('element key lowercases the pseudo-element name', () => {
  assert.deepEqual(elementKeys(['h1::BEFORE']), ['h1::before']);
});

test('element key ignores a namespace prefix', () => {
  assert.deepEqual(elementKeys(['svg|h1']), ['h1']);
});

test('element key ignores a wildcard namespace prefix', () => {
  assert.deepEqual(elementKeys(['*|h1']), ['h1']);
});

test('element key ignores an empty namespace prefix', () => {
  assert.deepEqual(elementKeys(['|h1']), ['h1']);
});

test('element key of a class selector is unknown', () => {
  assert.equal(elementKeys(['.a']), null);
});

test('element key of the universal selector is unknown', () => {
  assert.equal(elementKeys(['*']), null);
});

test('element key of an id selector is unknown', () => {
  assert.equal(elementKeys(['#id']), null);
});

test('element key of an is() selector is unknown, since its element type is a list', () => {
  assert.equal(elementKeys([':is(h1)']), null);
});

test('element key of a type selector with a pseudo-class is unknown', () => {
  assert.equal(elementKeys(['h1:hover']), null);
});

test('element key of a type selector with an attribute selector is unknown', () => {
  assert.equal(elementKeys(['h1[x]']), null);
});

test('element key of a type selector with a class is unknown', () => {
  assert.equal(elementKeys(['h1.a']), null);
});

test('element key of the nesting selector is unknown', () => {
  assert.equal(elementKeys(['&']), null);
});

test('element key of the host pseudo-class is unknown', () => {
  assert.equal(elementKeys([':host']), null);
});

test('element key of a slotted pseudo-element is unknown', () => {
  assert.equal(elementKeys(['::slotted(span)']), null);
});

test('element key of a part pseudo-element is unknown', () => {
  assert.equal(elementKeys(['h1::part(x)']), null);
});

test('element key of an escaped type name is unknown, since it is not decoded', () => {
  assert.equal(elementKeys(['h\\31']), null);
});

test('element keys of a selector list are unknown when any selector has no key', () => {
  assert.equal(elementKeys(['h1', '.a']), null);
});

test('element keys of a selector list hold each selector key once', () => {
  assert.deepEqual(elementKeys(['h1', 'h2', 'h1']), ['h1', 'h2']);
});

test('element key of a selector with surrounding whitespace is its type', () => {
  assert.deepEqual(elementKeys([' h1 ']), ['h1']);
});

test('element key of a vendor-prefixed pseudo-element is unknown, since browsers alias it to a standard one', () => {
  assert.equal(elementKeys(['input::-moz-placeholder']), null);
});

test('element key of a vendor-prefixed pseudo-element is unknown in any selector of a list', () => {
  assert.equal(elementKeys(['h1', 'input::-webkit-input-placeholder']), null);
});

test('element key of a pseudo-element with an unlisted vendor prefix is unknown, since any name starting with a dash is a vendor extension', () => {
  assert.equal(elementKeys(['p::-foo-bar']), null);
});

test('element key of a descendant selector is unknown when its last compound has a class', () => {
  assert.equal(elementKeys(['ul li.active']), null);
});

test('element key of a descendant selector is unknown when its last compound is an id', () => {
  assert.equal(elementKeys(['nav #x']), null);
});

test('element key of a descendant selector is the lowercase type of its last compound', () => {
  assert.deepEqual(elementKeys(['.a DIV  SPAN']), ['span']);
});
