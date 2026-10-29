import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import minifySelectors from '../../src/plugins/postcss-minify-selectors/index.js';

const plugin = oneStagePlugin(minifySelectors);
import { isFixedPointSelector } from '../../src/plugins/postcss-minify-selectors/lib/fixedPointSelector.js';
import { normalizeList } from '../../src/plugins/postcss-minify-selectors/lib/selectorScanner.js';
import {
  repositoryFile,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';

test('classifies generated fixed-point selectors consistently with normalization', () => {
  const names = ['a', 'A', 'item-1', '_private', '123'];
  const selectors = [];

  for (const name of names) {
    selectors.push(
      name,
      `.${name}`,
      `#${name}`,
      `${name}.${name}#${name}`,
      `.${name} #${name} ${name}.${name}`
    );
  }

  for (const selector of selectors) {
    assert.equal(isFixedPointSelector(selector), true, selector);
    assert.equal(
      normalizeList(selector, true, true, false, false),
      selector,
      selector
    );
  }
});

test('rejects selectors outside the narrow fixed-point grammar', () => {
  for (const selector of [
    '.a,.b',
    '[data-value]',
    '.escaped\\+name',
    '.a/**/.b',
    '*',
    'ns|a',
    '.a>.b',
    '.a  .b',
    ' .a',
    '.a ',
    '.café',
    '& .a',
  ]) {
    assert.equal(isFixedPointSelector(selector), false, selector);
  }
});

test('accepts a lowercase pseudo-class after a compound names its element and classes', () => {
  for (const selector of [
    '.btn:hover',
    'a:focus-visible',
    'li:first-child',
    '.x:not-a-function',
    '.a:hover .b:focus',
    '.a.b:hover',
  ]) {
    assert.equal(isFixedPointSelector(selector), true, selector);
  }
});

test('every selector the fixed-point check accepts is left unchanged by normalizeList', () => {
  for (const selector of [
    'a',
    '.a.b#c .d',
    '.btn:hover',
    'a:focus-visible',
    'li:first-child',
    '.x:not-a-function',
    '.a:hover .b:focus',
    '.a:before',
    '.a:hover:before',
  ]) {
    assert.equal(isFixedPointSelector(selector), true, selector);
    assert.equal(
      normalizeList(selector, true, true, false, false),
      selector,
      selector
    );
  }
});

test('rejects pseudo-elements, uppercase, vendor and functional pseudo-class names', () => {
  for (const selector of [
    'a::before',
    'a:HOVER',
    'a:hoVer',
    'a:-moz-focusring',
    'a:is(b)',
    'a:hover:',
    'a:hover::before',
    'a:9x',
  ]) {
    assert.equal(isFixedPointSelector(selector), false, selector);
  }
});

test('does not use the fixed-point path for keyframe selectors', async () => {
  const input = '@keyframes fade{from{opacity:0}to{opacity:1}}';
  const result = await postcss([plugin()]).process(input, {
    from: repositoryFile,
  });

  assert.equal(result.css, '@keyframes fade{0%{opacity:0}to{opacity:1}}');
});

test('retains raw selector metadata on the fixed-point path', async () => {
  const root = postcss.parse('.utility{color:red}');
  const rule = root.first;
  const rawSelector = { raw: '.utility', value: '.utility' };
  rule.raws.selector = rawSelector;

  await postcss([plugin()]).process(root, { from: repositoryFile });

  assert.strictEqual(rule.raws.selector, rawSelector);
  assert.equal(rule.selector, '.utility');
});
