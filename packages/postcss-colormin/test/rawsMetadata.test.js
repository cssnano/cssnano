import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import plugin from '../src/index.js';

describe('Raw PostCSS metadata handling and synchronization', () => {
  test('should read decl.raws.value.raw when decl.raws.value.value === decl.value', async () => {
    const root = postcss.parse('h1{color:white}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = { raw: '\\77 hite', value: 'white' };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '#fff');
    assert.deepStrictEqual(decl.raws.value, { raw: '#fff', value: '#fff' });
  });

  test('should synchronize decl.raws.value on both cache miss and cache hit', async () => {
    const root = postcss.parse('h1{color:white} h2{color:white}');
    const decl1 = /** @type {import('postcss').Declaration} */ (
      root.nodes?.[0]?.nodes?.[0]
    );
    const decl2 = /** @type {import('postcss').Declaration} */ (
      root.nodes?.[1]?.nodes?.[0]
    );

    decl1.raws.value = { raw: 'white', value: 'white' };
    decl2.raws.value = { raw: 'white', value: 'white' };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl1.value, '#fff');
    assert.deepStrictEqual(decl1.raws.value, { raw: '#fff', value: '#fff' });

    assert.strictEqual(decl2.value, '#fff');
    assert.deepStrictEqual(decl2.raws.value, { raw: '#fff', value: '#fff' });
  });

  test('should fallback to decl.value when decl.raws.value.value !== decl.value', async () => {
    const root = postcss.parse('h1{color:black}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    // Simulate previous plugin mutating decl.value to 'white' without updating raws
    decl.value = 'white';
    decl.raws.value = { raw: 'black', value: 'black' };

    await postcss([plugin()]).process(root, { from: undefined });

    // Should transform 'white' to '#fff', ignoring stale 'black' raws
    assert.strictEqual(decl.value, '#fff');
    assert.deepStrictEqual(decl.raws.value, { raw: '#fff', value: '#fff' });
  });
});
