import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '@csstools/css-tokenizer';
import { unicodeRange } from '../../src/values/unicodeRange.js';

test('unicodeRange reads back as the unicode-range token the tokenizer reads from its text', () => {
  for (const [start, end, prefix] of [
    [0x0, 0x7f, 'u'],
    [0x41, 0x41, 'U'],
    [0x30, 0x3f, 'u'],
    [0x0, 0xff, 'u'],
  ]) {
    const built = unicodeRange(start, end, prefix);
    const [read] = tokenize({ css: built[1], unicodeRangesAllowed: true });
    assert.deepEqual(
      [built[0], built[1], built[4]],
      [read[0], read[1], read[4]]
    );
  }
});

test('unicodeRange writes a range that covers a power-of-16 block as wildcards', () => {
  assert.equal(unicodeRange(0x30, 0x3f, 'u')[1], 'u+3?');
});
