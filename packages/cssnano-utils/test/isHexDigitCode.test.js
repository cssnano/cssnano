import { test } from 'node:test';
import assert from 'node:assert/strict';
import isHexDigitCode from '../src/isHexDigitCode.js';

const hexDigits = new Set('0123456789abcdefABCDEF');

test('isHexDigitCode accepts exactly the ASCII hex digits among all BMP code units', () => {
  for (let code = 0; code <= 0xffff; code++) {
    assert.equal(
      isHexDigitCode(code),
      hexDigits.has(String.fromCharCode(code)),
      `U+${code.toString(16)}`
    );
  }
});

test('isHexDigitCode rejects NaN from an out-of-range charCodeAt', () => {
  assert.equal(isHexDigitCode(''.charCodeAt(0)), false);
});
