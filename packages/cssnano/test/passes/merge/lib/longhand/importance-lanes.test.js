import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { importanceLanes } from './helpers/importanceLanes.js';

describe('importanceLanes', () => {
  test('ignores an all declaration in another run separated by a nested rule', () => {
    const root = postcss.parse('a{all:unset;&{x:y}margin-top:1px}');
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const margin = /** @type {import('postcss').Declaration} */ (rule.last);
    assert.deepStrictEqual(importanceLanes(rule, [margin]), [[margin], []]);
  });
});
