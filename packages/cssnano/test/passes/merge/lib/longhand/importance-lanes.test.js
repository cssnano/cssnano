import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { importanceLanes } from './helpers/importanceLanes.js';
import { blockOf } from './helpers/declarationItems.js';

describe('importanceLanes', () => {
  test('ignores an all declaration in another run separated by a nested rule', () => {
    const list = blockOf('a{all:unset;&{x:y}margin-top:1px}');
    assert.deepStrictEqual(importanceLanes(list, [1]), [[1], []]);
  });
});
