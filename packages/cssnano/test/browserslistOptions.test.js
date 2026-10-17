import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import defaultPreset from '#presets/default';
import { presetEntriesKey } from '../src/presets/presetEntries.js';
import { validateOptions } from '../src/options.js';

/** @param {Record<string, unknown>} input */
const validate = (input) =>
  validateOptions(input, 'inline', defaultPreset[presetEntriesKey]);

describe('browserslist options', () => {
  test('throws for a browserslist key that is not an option, because ignoring it would change the targets', () => {
    assert.throws(
      () => validate({ browserslist: { query: 'defaults', quary: 'ie 11' } }),
      {
        name: 'TypeError',
        message: '"quary" in browserslist is not an option.',
      }
    );
  });

  test('accepts every browserslist option under its browserslist name', () => {
    const input = {
      query: ['defaults', 'not ie <= 11'],
      env: 'modern',
      stats: { chrome: { 150: 1 } },
      path: '/project/src',
      config: './browsers.rc',
      ignoreUnknownVersions: true,
      mobileToDesktop: true,
      throwOnMissing: false,
    };
    assert.deepStrictEqual(validate({ browserslist: input }), {
      browserslist: input,
    });
  });

  test('throws for dangerousExtend, because it turns off the check on which packages a config may extend', () => {
    assert.throws(() => validate({ browserslist: { dangerousExtend: true } }), {
      name: 'TypeError',
      message:
        'Option "browserslist.dangerousExtend" is not supported, because it would let a browserslist config extend any package.',
    });
  });

  test('throws for a browserslist flag that is not a boolean', () => {
    assert.throws(
      () => validate({ browserslist: { mobileToDesktop: 'yes' } }),
      {
        name: 'TypeError',
        message: 'Option "browserslist.mobileToDesktop" must be a boolean.',
      }
    );
  });

  test('throws for a browserslist config path that is empty', () => {
    assert.throws(() => validate({ browserslist: { config: '' } }), {
      name: 'TypeError',
      message: 'Option "browserslist.config" must be a non-empty string.',
    });
  });

  test('throws for a browserslist env that is empty, because it names no environment', () => {
    assert.throws(() => validate({ browserslist: { env: '' } }), {
      name: 'TypeError',
      message: 'Option "browserslist.env" must be a non-empty string.',
    });
  });

  test('throws for a browserslist stats path that is empty, because it names no file', () => {
    assert.throws(() => validate({ browserslist: { stats: '' } }), {
      name: 'TypeError',
      message:
        'Option "browserslist.stats" must be a non-empty string or a stats object.',
    });
  });
});
