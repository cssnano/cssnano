import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';
import { assertScaling } from './helpers/scalingHelper.js';

test('folds many independent eligible positions without pairwise scans', () => {
  assertScaling(
    [1_000, 2_000, 4_000, 8_000],
    (count) => {
      const selectors = [];
      const expected = [];
      for (let index = 0; index < count; index++) {
        selectors.push(`.prefix-${index} .a .suffix-${index}`);
        selectors.push(`.prefix-${index} .b .suffix-${index}`);
        expected.push(`.prefix-${index} :is(.a,.b) .suffix-${index}`);
      }
      return {
        input: selectors.join(','),
        expected: expected.join(','),
        sort: false,
        convertToIs: true,
      };
    },
    { label: 'fold' }
  );
});

test('folds a wide group sharing long structural prefixes and suffixes', () => {
  const commonPrefix = Array.from({ length: 64 }, (_, i) => `.p-${i}`).join(
    ' '
  );
  const commonSuffix = Array.from({ length: 64 }, (_, i) => `.s-${i}`).join(
    ' '
  );
  const middles = Array.from({ length: 256 }, (_, i) => `.m-${i}`);
  const input = middles
    .map((middle) => `${commonPrefix} ${middle} ${commonSuffix}`)
    .join(',');
  assert.equal(
    normalizeList(input, false, true),
    `${commonPrefix} :is(${middles.join(',')}) ${commonSuffix}`
  );
});

test('mostly-unique widths have bounded doubling ratios', () => {
  assertScaling(
    [2_000, 4_000, 8_000, 16_000],
    (count) => {
      const input = Array.from(
        { length: count },
        (_, index) => `.item-${index}:not(.disabled-${index})`
      ).join(',');
      return {
        input,
        expected: input,
        sort: false,
        convertToIs: false,
      };
    },
    { label: 'mostly-unique' }
  );
});

test('supported and opaque nesting remain stack-safe at required depths', () => {
  for (const depth of [12_000, 32_000]) {
    const supported = `${':is('.repeat(depth)}.item${')'.repeat(depth)}`;
    const opaque = `${':framework('.repeat(depth)}.item${')'.repeat(depth)}`;
    assert.equal(normalizeList(supported, false, false), supported);
    assert.equal(normalizeList(opaque, false, false), opaque);
  }
});

test('deep functions with sibling content remain structural', () => {
  for (const depth of [12_000, 32_000]) {
    const input = `${':is(.sibling,'.repeat(depth)}.item${')'.repeat(depth)}`;
    assert.equal(normalizeList(input, false, false), input);
  }
});
