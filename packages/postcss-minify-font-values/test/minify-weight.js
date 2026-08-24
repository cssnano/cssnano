import nodetest from 'node:test';
import assert from 'node:assert/strict';
import minifyWeight from '../src/lib/minify-weight.js';

const { test } = nodetest;
test('minify-weight', () => {
  assert.strictEqual(minifyWeight('normal'), '400');
  assert.strictEqual(minifyWeight('bold'), '700');
  assert.strictEqual(minifyWeight('lighter'), 'lighter');
  assert.strictEqual(minifyWeight('bolder'), 'bolder');
});
