import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import litePreset from '#presets/lite';
import { resolveOptions } from '../src/config.js';
import {
  presetConfigureKey,
  presetEntriesKey,
  presetNameKey,
} from '../src/presets/presetEntries.js';

/**
 * A preset that stands in for one built by another copy of cssnano. It shares
 * the registry keys and a builder, so cssnano accepts it, but its plugins are
 * its own.
 *
 * @param {(options: unknown) => unknown[]} run the plugins it returns
 */
const presetFromOtherCopy = (run) =>
  Object.assign(() => [], {
    [presetEntriesKey]: litePreset[presetEntriesKey],
    [presetNameKey]: 'lite',
    [presetConfigureKey]: (/** @type {unknown} */ options) => run(options),
  });

describe('a preset whose plugin list has a different shape', () => {
  test('is rejected as not a preset, rather than crashing on a plugin entry that cssnano cannot read', () => {
    const preset = Object.assign(() => [], {
      [presetEntriesKey]: [[() => ({}), 'colormin', {}]],
      [presetNameKey]: 'lite',
    });
    assert.throws(
      () => resolveOptions({ preset, options: { colormin: { x: 1 } } }),
      {
        name: 'TypeError',
        message: /must be a preset imported from cssnano/v,
      }
    );
  });
});

describe('a preset without the builder of its plugins', () => {
  test('is rejected as not a preset, because cssnano could only guess how to build its plugins', () => {
    const preset = Object.assign(() => [], {
      [presetEntriesKey]: litePreset[presetEntriesKey],
      [presetNameKey]: 'lite',
    });
    assert.throws(() => resolveOptions({ preset }), {
      name: 'TypeError',
      message: /must be a preset imported from cssnano/v,
    });
  });
});

describe('a preset from another copy of cssnano', () => {
  test('is called with the browser targets, so its own plugins read them', () => {
    const calls = [];
    const preset = presetFromOtherCopy((options) => {
      calls.push(options);
      return [];
    });
    resolveOptions({ preset, browserslist: { query: 'chrome 100' } });
    assert.deepStrictEqual(calls, [{ browserslist: { query: 'chrome 100' } }]);
  });

  test('is called with its disable list, which it applies to its own plugins', () => {
    const calls = [];
    const preset = presetFromOtherCopy((options) => {
      calls.push(options);
      return [];
    });
    resolveOptions({ preset, disable: ['discardComments'] });
    assert.deepStrictEqual(calls, [{ disable: ['discardComments'] }]);
  });

  test('returns the plugins that its preset returns', () => {
    const marker = { postcssPlugin: 'marker' };
    const preset = presetFromOtherCopy(() => [marker]);
    assert.deepStrictEqual(resolveOptions({ preset }), [marker]);
  });
});
