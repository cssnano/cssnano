import { test } from 'node:test';
import assert from 'node:assert/strict';
import isCSSNewline from '../../src/utils/isCSSNewline.js';

const newlines = new Set('\n\r\f');

test('isCSSNewline accepts exactly the CSS newlines among all BMP code units', () => {
  for (let code = 0; code <= 0xffff; code++) {
    assert.equal(
      isCSSNewline(code),
      newlines.has(String.fromCharCode(code)),
      `U+${code.toString(16)}`
    );
  }
});

test('isCSSNewline rejects NaN from an out-of-range charCodeAt', () => {
  assert.equal(isCSSNewline(''.charCodeAt(0)), false);
});
