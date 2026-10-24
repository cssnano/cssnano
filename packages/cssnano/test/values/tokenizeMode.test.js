import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenType } from '@csstools/css-tokenizer';
import { tokenizeMode } from '../../src/values/tokenizeMode.js';
import { tokens } from '../../src/utils/value.js';

describe('tokenizeMode', () => {
  test('tokenizeMode gives unicode-range the mode that reads a U+ range as one token', () => {
    const [range] = tokens('U+0-7F', tokenizeMode('unicode-range'));
    assert.equal(range[0], TokenType.UnicodeRange);
  });

  test('tokenizeMode matches unicode-range in any ASCII letter case', () => {
    assert.notEqual(tokenizeMode('UNICODE-RANGE'), undefined);
    assert.notEqual(tokenizeMode('Unicode-Range'), undefined);
  });

  test('tokenizeMode gives other properties the default mode', () => {
    assert.equal(tokenizeMode('font-family'), undefined);
  });

  test('tokenizeMode does not match a property that only begins with unicode-range', () => {
    assert.equal(tokenizeMode('unicode-range-x'), undefined);
  });

  test('tokenizeMode does not match a vendor-prefixed unicode-range', () => {
    assert.equal(tokenizeMode('-webkit-unicode-range'), undefined);
  });
});
