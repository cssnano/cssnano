import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import colormin from '../packages/cssnano/src/plugins/postcss-colormin/index.js';
import { changedValues, invalidBecameValid } from './valueValidity.js';
import { oneStagePlugin } from './testHelpers.js';

describe('changedValues', () => {
  test('lists the property, input and output of a declaration the stage changes', async () => {
    const changes = await changedValues(
      'a{color:#ff0000}',
      oneStagePlugin(colormin)()
    );
    assert.deepStrictEqual(changes, [
      { prop: 'color', before: '#ff0000', after: 'red' },
    ]);
  });

  test('omits a declaration the stage leaves as it was', async () => {
    const changes = await changedValues(
      'a{color:red}',
      oneStagePlugin(colormin)()
    );
    assert.deepStrictEqual(changes, []);
  });

  test('lists declarations nested in at-rules, in document order', async () => {
    const changes = await changedValues(
      '@media print{a{color:#ff0000}}b{color:#0000ff}',
      oneStagePlugin(colormin)()
    );
    assert.deepStrictEqual(
      changes.map((change) => change.before),
      ['#ff0000', '#0000ff']
    );
  });
});

const supports = (/** @type {string} */ _prop, /** @type {string} */ value) =>
  value === 'red';

describe('invalidBecameValid', () => {
  test('reports a change whose input the browser rejects and whose output it accepts', () => {
    const change = { prop: 'color', before: 'rd', after: 'red' };
    assert.deepStrictEqual(invalidBecameValid([change], supports), [change]);
  });

  test('accepts a change whose input was already valid', () => {
    const change = { prop: 'color', before: 'red', after: 'red' };
    assert.deepStrictEqual(invalidBecameValid([change], supports), []);
  });

  test('accepts a change whose output is still invalid, because the declaration stays ignored', () => {
    const change = { prop: 'color', before: 'rd', after: 'rd2' };
    assert.deepStrictEqual(invalidBecameValid([change], supports), []);
  });
});
