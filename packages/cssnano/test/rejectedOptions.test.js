import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import { presetEntriesKey } from '../src/presets/presetEntries.js';
import { validateOptions } from '../src/options.js';

const presets = {
  default: defaultPreset,
  lite: litePreset,
  advanced: advancedPreset,
};

/**
 * @param {Record<string, unknown>} input
 * @param {Parameters<typeof validateOptions>[1]} [place]
 * @param {keyof typeof presets} [preset] the preset that runs the options
 */
const validate = (input, place = 'inline', preset = 'default') =>
  validateOptions(input, place, presets[preset][presetEntriesKey]);

describe('a plugin name or exclude written where it would be dropped', () => {
  test('throws for the exclude key of a plugin option, and names disable', () => {
    assert.throws(
      () => validate({ options: { colormin: { exclude: true } } }),
      {
        message:
          '"exclude" in options.colormin is not an option; use disable: ["colormin"] to turn the plugin off.',
      }
    );
  });

  test('throws for a top-level exclude key, and names disable', () => {
    assert.throws(() => validate({ exclude: ['colormin'] }), {
      message:
        '"exclude" is not an option of cssnano options; list the plugins to turn off in disable.',
    });
  });

  test('throws for a top-level plugin name, so a disabled plugin is not silently kept', () => {
    assert.throws(() => validate({ discardComments: false }), {
      message:
        '"discardComments" is a plugin, not an option; use disable: ["discardComments"] to turn it off or options.discardComments to configure it.',
    });
  });

  test('throws for a plugin name at the preset place, such as defaultPreset({discardComments: false})', () => {
    assert.throws(() => validate({ discardComments: false }, 'preset'), {
      message:
        '"discardComments" is a plugin, not an option; use disable: ["discardComments"] to turn it off or options.discardComments to configure it.',
    });
  });
});

describe('a removed target option', () => {
  test('throws for overrideBrowserslist inside a plugin, because ignoring it would widen the targets', () => {
    assert.throws(
      () =>
        validate({
          options: { discardComments: { overrideBrowserslist: 'defaults' } },
        }),
      {
        message:
          '"overrideBrowserslist" in options.discardComments was removed; set browserslist.query instead.',
      }
    );
  });

  test('throws for env inside a plugin, and points to browserslist', () => {
    assert.throws(
      () => validate({ options: { colormin: { env: 'production' } } }),
      {
        message:
          '"env" in options.colormin was removed; set browserslist.env instead.',
      }
    );
  });

  test('throws for stats inside a plugin, and points to browserslist', () => {
    assert.throws(
      () => validate({ options: { colormin: { stats: 'stats.json' } } }),
      {
        message:
          '"stats" in options.colormin was removed; set browserslist.stats instead.',
      }
    );
  });

  test('throws for path inside a plugin, and points to browserslist', () => {
    assert.throws(
      () => validate({ options: { colormin: { path: 'src/index.css' } } }),
      {
        message:
          '"path" in options.colormin was removed; set browserslist.path instead.',
      }
    );
  });

  test('throws for overrideBrowserslist at the top level, because ignoring it would widen the targets', () => {
    assert.throws(() => validate({ overrideBrowserslist: 'ie 11' }), {
      message:
        'Option "overrideBrowserslist" was removed; set browserslist.query instead.',
    });
  });

  test('throws for env at the top level, and points to browserslist', () => {
    assert.throws(() => validate({ env: 'production' }), {
      message: 'Option "env" was removed; set browserslist.env instead.',
    });
  });

  test('throws for stats at the top level, and points to browserslist', () => {
    assert.throws(() => validate({ stats: 'stats.json' }), {
      message: 'Option "stats" was removed; set browserslist.stats instead.',
    });
  });

  test('throws for path at the top level, and points to browserslist', () => {
    assert.throws(() => validate({ path: './src' }), {
      message: 'Option "path" was removed; set browserslist.path instead.',
    });
  });
});
