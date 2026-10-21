import assert from 'node:assert/strict';
import { test } from 'node:test';
import { definePreset } from '../src/presets/configurePlugins.js';
import { browserTargets } from '#utils/browser-targets';

/**
 * A preset with one entry that hosts two transforms, and a creator that
 * records each call.
 *
 * @returns {{preset: ReturnType<typeof definePreset>, calls: object[]}}
 */
function twoTransformPreset() {
  /** @type {object[]} */
  const calls = [];
  const creator = (/** @type {object} */ options) => {
    calls.push(options);
    return { postcssPlugin: 'test-pass' };
  };
  const preset = definePreset('test', [
    [
      creator,
      'pass',
      {
        postcssPlugin: 'test-pass',
        transforms: [
          { name: 'first', optionKeys: ['level'], defaults: { level: 1 } },
          { name: 'second', optionKeys: [], targets: true },
        ],
      },
    ],
  ]);
  return { preset, calls };
}

test('a multi-transform entry calls its creator once with the enabled transforms and their options', () => {
  const { preset, calls } = twoTransformPreset();
  preset();
  assert.equal(calls.length, 1);
  assert.deepStrictEqual(calls[0].enabled, new Set(['first', 'second']));
  assert.deepStrictEqual(calls[0].options, { first: { level: 1 }, second: {} });
  assert.ok(calls[0][browserTargets]);
});

test('disable removes one transform from the enabled set, and the entry still runs', () => {
  const { preset, calls } = twoTransformPreset();
  const plugins = preset({ disable: ['first'] });
  assert.equal(plugins.length, 1);
  assert.deepStrictEqual(calls[0].enabled, new Set(['second']));
  assert.deepStrictEqual(calls[0].options, { second: {} });
});

test('an entry whose transforms are all disabled is left out, and its creator is not called', () => {
  const { preset, calls } = twoTransformPreset();
  const plugins = preset({ disable: ['first', 'second'] });
  assert.equal(plugins.length, 0);
  assert.equal(calls.length, 0);
});

test('options configure a transform by its name, merged over its defaults', () => {
  const { preset, calls } = twoTransformPreset();
  preset({ options: { first: { level: 2 } } });
  assert.deepStrictEqual(calls[0].options.first, { level: 2 });
});

test('disable rejects the entry name, because an entry with transforms is not an option', () => {
  const { preset } = twoTransformPreset();
  assert.throws(() => preset({ disable: ['pass'] }), {
    message: '"pass" in disable is not a transform that the preset runs.',
  });
});

test('options rejects the entry name, because an entry with transforms is not an option', () => {
  const { preset } = twoTransformPreset();
  assert.throws(() => preset({ options: { pass: {} } }), {
    message: '"pass" in options is not a transform that the preset runs.',
  });
});

test('a multi-transform entry is given the browser targets only when an enabled transform reads them', () => {
  const { preset, calls } = twoTransformPreset();
  preset({ disable: ['second'] });
  assert.equal(calls[0][browserTargets], undefined);
});
