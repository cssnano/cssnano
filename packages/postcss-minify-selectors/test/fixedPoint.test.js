import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { isFixedPointSelector } from '../src/lib/fixedPointSelector.js';
import { normalizeList } from '../src/lib/selectorScanner.js';

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
    '.a:hover',
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

test('does not use the fixed-point path for keyframe selectors', async () => {
  const input = '@keyframes fade{from{opacity:0}to{opacity:1}}';
  const result = await postcss([plugin()]).process(input, { from: undefined });

  assert.equal(result.css, '@keyframes fade{0%{opacity:0}to{opacity:1}}');
});

test('retains raw selector metadata on the fixed-point path', async () => {
  const root = postcss.parse('.utility{color:red}');
  const rule = root.first;
  const rawSelector = { raw: '.utility', value: '.utility' };
  rule.raws.selector = rawSelector;

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(rule.raws.selector, rawSelector);
  assert.equal(rule.selector, '.utility');
});
