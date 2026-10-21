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

describe('a merge transform that was split into options', () => {
  const mergeMessage =
    'disable merge instead; longhand merging and duplicate removal now run together, and disabling merge also turns off rule merging.';
  const rulesMessage = 'set options.merge.rules to false instead.';

  test('throws for mergeLonghand in disable, and names disable merge', () => {
    assert.throws(() => validate({ disable: ['mergeLonghand'] }), {
      message: `"mergeLonghand" in disable was removed; ${mergeMessage}`,
    });
  });

  test('throws for discardDuplicates in disable, and names disable merge', () => {
    assert.throws(() => validate({ disable: ['discardDuplicates'] }), {
      message: `"discardDuplicates" in disable was removed; ${mergeMessage}`,
    });
  });

  test('throws for mergeRules in disable, and names options.merge.rules', () => {
    assert.throws(() => validate({ disable: ['mergeRules'] }), {
      message: `"mergeRules" in disable was removed; ${rulesMessage}`,
    });
  });

  test('throws for mergeLonghand in options, and names disable merge', () => {
    assert.throws(() => validate({ options: { mergeLonghand: {} } }), {
      message: `"mergeLonghand" in options was removed; ${mergeMessage}`,
    });
  });

  test('throws for discardDuplicates in options, and names disable merge', () => {
    assert.throws(() => validate({ options: { discardDuplicates: {} } }), {
      message: `"discardDuplicates" in options was removed; ${mergeMessage}`,
    });
  });

  test('throws for mergeRules in options, and names options.merge.rules', () => {
    assert.throws(() => validate({ options: { mergeRules: {} } }), {
      message: `"mergeRules" in options was removed; ${rulesMessage}`,
    });
  });

  test('throws for mergeLonghand at the top level, and names disable merge', () => {
    assert.throws(() => validate({ mergeLonghand: false }), {
      message: `Option "mergeLonghand" was removed; ${mergeMessage}`,
    });
  });

  test('throws for mergeRules at the top level, and names options.merge.rules', () => {
    assert.throws(() => validate({ mergeRules: false }), {
      message: `Option "mergeRules" was removed; ${rulesMessage}`,
    });
  });

  test('throws for a non-boolean merge rules option, so the rule merging is not guessed', () => {
    assert.throws(() => validate({ options: { merge: { rules: 'no' } } }), {
      message: 'Option "options.merge.rules" must be a boolean.',
    });
  });

  test('accepts merge rules set to false', () => {
    assert.doesNotThrow(() =>
      validate({ options: { merge: { rules: false } } })
    );
  });
});
