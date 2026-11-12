import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '@csstools/css-tokenizer';
import { sameTokenText } from '../../src/values/sameTokenText.js';

test('sameTokenText accepts lists with identical token texts', () => {
  assert.equal(
    sameTokenText(tokenize({ css: 'a, b' }), tokenize({ css: 'a, b' })),
    true
  );
});

test('sameTokenText rejects lists whose token texts differ', () => {
  assert.equal(
    sameTokenText(tokenize({ css: 'a, b' }), tokenize({ css: 'a,b' })),
    false
  );
});

test('sameTokenText rejects lists of different length', () => {
  assert.equal(
    sameTokenText(tokenize({ css: 'a' }), tokenize({ css: 'a b' })),
    false
  );
});
