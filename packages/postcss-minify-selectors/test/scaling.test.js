import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';

test('folds many independent eligible positions without pairwise scans', () => {
  const cpuTime = [];
  for (const count of [1_000, 2_000, 4_000, 8_000]) {
    const selectors = [];
    const expected = [];
    for (let index = 0; index < count; index++) {
      selectors.push(`.prefix-${index} .a .suffix-${index}`);
      selectors.push(`.prefix-${index} .b .suffix-${index}`);
      expected.push(`.prefix-${index} :is(.a,.b) .suffix-${index}`);
    }
    const start = process.cpuUsage();
    assert.equal(
      normalizeList(selectors.join(','), false, true),
      expected.join(',')
    );
    const usage = process.cpuUsage(start);
    cpuTime.push(usage.user + usage.system);
  }
  for (let index = 1; index < cpuTime.length; index++)
    assert.ok(
      cpuTime[index] / cpuTime[index - 1] < 3,
      `fold doubling ratio ${index}: ${(cpuTime[index] / cpuTime[index - 1]).toFixed(2)}`
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
  const cpuTime = [];
  for (const count of [2_000, 4_000, 8_000, 16_000]) {
    const input = Array.from(
      { length: count },
      (_, index) => `.item-${index}:not(.disabled-${index})`
    ).join(',');
    const start = process.cpuUsage();
    assert.equal(normalizeList(input, false, false), input);
    const usage = process.cpuUsage(start);
    cpuTime.push(usage.user + usage.system);
  }
  for (let index = 1; index < cpuTime.length; index++)
    assert.ok(
      cpuTime[index] / cpuTime[index - 1] < 3,
      `doubling ratio ${index}: ${(cpuTime[index] / cpuTime[index - 1]).toFixed(2)}`
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
