import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import cssnano from '../src/index.js';

describe('a configuration that names plugins without a preset, which the default preset serves', () => {
  test('throws a type error for a disable that is not a list', () => {
    assert.throws(() => cssnano({ disable: 'colormin' }), {
      name: 'TypeError',
      message: 'Option "disable" must be an array of strings.',
    });
  });

  test('accepts an options key whose value is undefined, because it sets no plugin', () => {
    assert.doesNotThrow(() => cssnano({ options: { colormin: undefined } }));
  });

  test('accepts a plugin that the default preset runs in disable', () => {
    assert.doesNotThrow(() => cssnano({ disable: ['colormin'] }));
  });
});
