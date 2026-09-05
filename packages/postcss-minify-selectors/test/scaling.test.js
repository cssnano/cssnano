import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';

test('folds many independent eligible positions without pairwise scans', () => {
  const elapsed = [];
  for (const count of [250, 500, 1_000]) {
    const selectors = [];
    const expected = [];
    for (let index = 0; index < count; index++) {
      selectors.push(`.prefix-${index} .a .suffix-${index}`);
      selectors.push(`.prefix-${index} .b .suffix-${index}`);
      expected.push(`.prefix-${index} :is(.a,.b) .suffix-${index}`);
    }
    const start = performance.now();
    assert.equal(
      normalizeList(selectors.join(','), false, true),
      expected.join(',')
    );
    elapsed.push(performance.now() - start);
  }
  for (let index = 1; index < elapsed.length; index++)
    assert.ok(
      elapsed[index] / elapsed[index - 1] < 6,
      `fold doubling ratio ${index}: ${(elapsed[index] / elapsed[index - 1]).toFixed(2)}`
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
  const elapsed = [];
  for (const count of [2_000, 4_000, 8_000]) {
    const input = Array.from(
      { length: count },
      (_, index) => `.item-${index}:not(.disabled-${index})`
    ).join(',');
    const start = performance.now();
    assert.equal(normalizeList(input, false, false), input);
    elapsed.push(performance.now() - start);
  }
  for (let index = 1; index < elapsed.length; index++)
    assert.ok(
      elapsed[index] / elapsed[index - 1] < 6,
      `doubling ratio ${index}: ${(elapsed[index] / elapsed[index - 1]).toFixed(2)}`
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
