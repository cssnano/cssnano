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

describe('known keys with a value that fails its guard', () => {
  test('treats a null disable list as absent, because a JSON file has no undefined', () => {
    assert.deepStrictEqual(validate({ disable: null }), {});
  });

  test('treats a null preset as absent, so the default preset runs', () => {
    assert.deepStrictEqual(validate({ preset: null }), {});
  });

  test('throws for a preset that is an array, a function or a plugin object, which are not imported presets', () => {
    assert.throws(
      () => validate({ preset: ['default', { colormin: false }] }),
      {
        message: /^Option "preset" must be a preset imported from cssnano/v,
      }
    );
    assert.throws(() => validate({ preset: () => [] }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
    assert.throws(() => validate({ preset: { plugins: [] } }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws for a browserslist query of the wrong type, and names the nested key', () => {
    assert.throws(() => validate({ browserslist: { query: 1 } }), {
      message:
        'Option "browserslist.query" must be a non-empty string or a non-empty array of non-empty strings.',
    });
  });

  test('throws for an empty browserslist query string, which matches no browsers', () => {
    assert.throws(() => validate({ browserslist: { query: '' } }), {
      message:
        'Option "browserslist.query" must be a non-empty string or a non-empty array of non-empty strings.',
    });
  });

  test('throws for a whitespace-only browserslist query string, which matches no browsers', () => {
    assert.throws(() => validate({ browserslist: { query: '  ' } }), {
      message:
        'Option "browserslist.query" must be a non-empty string or a non-empty array of non-empty strings.',
    });
  });

  test('throws for an empty browserslist query array, which matches no browsers', () => {
    assert.throws(() => validate({ browserslist: { query: [] } }), {
      message:
        'Option "browserslist.query" must be a non-empty string or a non-empty array of non-empty strings.',
    });
  });

  test('throws for a browserslist query array with an empty item', () => {
    assert.throws(
      () => validate({ browserslist: { query: ['defaults', ''] } }),
      {
        message:
          'Option "browserslist.query" must be a non-empty string or a non-empty array of non-empty strings.',
      }
    );
  });

  test('throws for an options entry that is not an object, and names the plugin', () => {
    assert.throws(() => validate({ options: { colormin: 'off' } }), {
      message: 'Option "options.colormin" must be an object.',
    });
  });

  test('treats a null plugin entry as absent, because a JSON file has no undefined', () => {
    assert.deepStrictEqual(validate({ options: { colormin: null } }), {
      options: {},
    });
  });
});

describe('undefined values', () => {
  test('treats a key whose value is undefined as absent', () => {
    assert.deepStrictEqual(
      validate({ preset: undefined, disable: undefined, options: undefined }),
      {}
    );
  });

  test('treats a plugin whose options are undefined as absent', () => {
    assert.deepStrictEqual(validate({ options: { colormin: undefined } }), {
      options: {},
    });
  });

  test('treats an undefined option key as absent, so it is not reported', () => {
    assert.deepStrictEqual(
      validate({ options: { colormin: { hex: undefined } } }),
      { options: { colormin: {} } }
    );
  });
});

describe('unknown items', () => {
  test('throws for a top-level key that is not an option', () => {
    assert.throws(() => validate({ presett: 'lite' }), {
      name: 'TypeError',
      message: '"presett" is not an option of cssnano options.',
    });
  });

  test('throws for svgo inside a plugin, because an unknown plugin option would run the default', () => {
    assert.throws(() => validate({ options: { colormin: { svgo: false } } }), {
      name: 'TypeError',
      message:
        '"svgo" in options.colormin was removed; run postcss-svgo before cssnano.',
    });
  });

  test('throws for a removed name inside options, such as svgo, and points to its replacement', () => {
    assert.throws(() => validate({ options: { svgo: {} } }), {
      message:
        '"svgo" in options was removed; run postcss-svgo before cssnano.',
    });
  });

  test('throws for svgo as a top-level key, and points to its replacement', () => {
    assert.throws(() => validate({ svgo: false }), {
      message: 'Option "svgo" was removed; run postcss-svgo before cssnano.',
    });
  });

  test('throws for a misspelled plugin name in disable', () => {
    assert.throws(() => validate({ disable: ['colorMin'] }), {
      message: '"colorMin" in disable is not a plugin that the preset runs.',
    });
  });

  test('throws for a misspelled plugin name in options', () => {
    assert.throws(() => validate({ options: { colorMin: {} } }), {
      message: '"colorMin" in options is not a plugin that the preset runs.',
    });
  });

  test('throws for a plugin in disable that only the advanced preset runs, when the default preset runs', () => {
    assert.throws(() => validate({ disable: ['zindex'] }), {
      message: '"zindex" in disable is not a plugin that the preset runs.',
    });
  });

  test('keeps a plugin option that the named preset runs', () => {
    assert.deepStrictEqual(validate({ options: { colormin: { hex: true } } }), {
      options: { colormin: { hex: true } },
    });
  });

  test('keeps a plugin in disable that the advanced preset runs, when the advanced preset runs', () => {
    assert.deepStrictEqual(
      validate({ disable: ['zindex'] }, 'inline', 'advanced'),
      { disable: ['zindex'] }
    );
  });

  test('throws for a plugin option that the lite preset does not run, even though the default preset runs it', () => {
    assert.throws(
      () =>
        validate(
          { preset: litePreset, options: { colormin: { hex: true } } },
          'inline',
          'lite'
        ),
      { message: '"colormin" in options is not a plugin that the preset runs.' }
    );
  });

  test('throws for a plugin in disable that the lite preset does not run', () => {
    assert.throws(() => validate({ disable: ['zindex'] }, 'inline', 'lite'), {
      message: '"zindex" in disable is not a plugin that the preset runs.',
    });
  });

  test('throws for an option key that the plugin does not declare, because a typo would run the default', () => {
    assert.throws(
      () => validate({ options: { colormin: { hex: true, hexx: true } } }),
      {
        name: 'TypeError',
        message: '"hexx" in options.colormin is not an option.',
      }
    );
  });

  test('throws for a top-level key that the place does not accept', () => {
    assert.throws(() => validate({ configFile: 'x.json' }, 'file'), {
      message: '"configFile" is not an option of a configuration file.',
    });
  });

  test('throws for the preset key inside a built preset, which takes no preset', () => {
    assert.throws(() => validate({ preset: litePreset }, 'preset'), {
      message: '"preset" is not an option of a built preset.',
    });
  });

  test('throws for the plugins key, and names its replacement, because it would be dropped', () => {
    assert.throws(
      () => validate({ plugins: [] }),
      /"plugins" was removed; configure additional PostCSS plugins in your PostCSS configuration\./v
    );
  });

  test('throws for svgo as a plugin name in disable, and names its replacement', () => {
    assert.throws(() => validate({ disable: ['svgo'] }), {
      message:
        '"svgo" in disable was removed; run postcss-svgo before cssnano.',
    });
  });
});

describe('a name in both disable and options', () => {
  test('throws, because the two contradict each other', () => {
    assert.throws(
      () =>
        validate({
          disable: ['colormin'],
          options: { colormin: { hex: true } },
        }),
      {
        message:
          'Plugin "colormin" is in both disable and options; remove it from one of them.',
      }
    );
  });

  test('keeps both lists when they name different plugins', () => {
    assert.deepStrictEqual(
      validate(
        {
          disable: ['zindex'],
          options: { colormin: { hex: true } },
        },
        'inline',
        'advanced'
      ),
      {
        disable: ['zindex'],
        options: { colormin: { hex: true } },
      }
    );
  });
});

describe('browser targets', () => {
  test('accepts stats as an object of browser versions and counts', () => {
    const stats = { chrome: { 90: 10 } };
    assert.deepStrictEqual(validate({ browserslist: { stats } }), {
      browserslist: { stats },
    });
  });

  test('accepts a Can I Use stats export, which browserslist reads from its dataByBrowser', () => {
    const stats = {
      id: 'caniuse',
      name: 'caniuse',
      dataByBrowser: { chrome: { 90: 10 } },
    };
    assert.deepStrictEqual(validate({ browserslist: { stats } }), {
      browserslist: { stats },
    });
  });

  test('throws for a Can I Use stats export whose dataByBrowser is not a stats object', () => {
    assert.throws(
      () => validate({ browserslist: { stats: { dataByBrowser: [1] } } }),
      {
        message:
          'Option "browserslist.stats" must be a non-empty string or a stats object.',
      }
    );
  });

  test('throws for stats that are neither a path nor a stats object', () => {
    assert.throws(() => validate({ browserslist: { stats: [1] } }), {
      message:
        'Option "browserslist.stats" must be a non-empty string or a stats object.',
    });
  });

  test('treats a browserslist query whose value is undefined as absent', () => {
    assert.deepStrictEqual(validate({ browserslist: { query: undefined } }), {
      browserslist: {},
    });
  });

  test('accepts a query, an environment and stats in browserslist', () => {
    assert.deepStrictEqual(
      validate({
        browserslist: {
          query: ['defaults'],
          env: 'production',
          stats: 'x.json',
        },
      }),
      {
        browserslist: {
          query: ['defaults'],
          env: 'production',
          stats: 'x.json',
        },
      }
    );
  });
});
