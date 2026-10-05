import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';

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
