import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import colormin from '../../src/plugins/postcss-colormin/index.js';

import {
  oneStagePlugin,
  repositoryFile,
} from '../../../../util/testHelpers.js';

const plugin = oneStagePlugin(colormin);

describe('Raw PostCSS metadata handling and synchronization', () => {
  test('should read decl.raws.value.raw when decl.raws.value.value === decl.value', async () => {
    const root = postcss.parse('h1{color:white}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = { raw: '\\77 hite', value: 'white' };

    await postcss([plugin()]).process(root, { from: repositoryFile });

    assert.strictEqual(decl.value, '#fff');
    assert.equal(decl.raws.value, undefined);
  });

  test('should synchronize decl.raws.value on both first and repeated values', async () => {
    const root = postcss.parse('h1{color:white} h2{color:white}');
    const decl1 = /** @type {import('postcss').Declaration} */ (
      root.nodes?.[0]?.nodes?.[0]
    );
    const decl2 = /** @type {import('postcss').Declaration} */ (
      root.nodes?.[1]?.nodes?.[0]
    );

    decl1.raws.value = { raw: 'white', value: 'white' };
    decl2.raws.value = { raw: 'white', value: 'white' };

    await postcss([plugin()]).process(root, { from: repositoryFile });

    // A changed value drops its raw, so the output prints the new decl.value.
    assert.strictEqual(decl1.value, '#fff');
    assert.equal(decl1.raws.value, undefined);

    assert.strictEqual(decl2.value, '#fff');
    assert.equal(decl2.raws.value, undefined);
  });

  test('should fallback to decl.value when decl.raws.value.value !== decl.value', async () => {
    const root = postcss.parse('h1{color:black}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    // Simulate previous plugin mutating decl.value to 'white' without updating raws
    decl.value = 'white';
    decl.raws.value = { raw: 'black', value: 'black' };

    await postcss([plugin()]).process(root, { from: repositoryFile });

    // Should transform 'white' to '#fff', ignoring stale 'black' raws
    assert.strictEqual(decl.value, '#fff');
    assert.equal(decl.raws.value, undefined);
  });
});
