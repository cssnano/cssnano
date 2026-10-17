import { test } from 'node:test';
import assert from 'node:assert/strict';
import isCSSWhitespace from '../../src/utils/isCSSWhitespace.js';

const whitespace = new Set(' \t\n\f\r');

test('isCSSWhitespace accepts exactly the CSS whitespace among all BMP code units', () => {
  for (let code = 0; code <= 0xffff; code++) {
    assert.equal(
      isCSSWhitespace(code),
      whitespace.has(String.fromCharCode(code)),
      `U+${code.toString(16)}`
    );
  }
});

test('isCSSWhitespace rejects NaN from an out-of-range charCodeAt', () => {
  assert.equal(isCSSWhitespace(''.charCodeAt(0)), false);
});
