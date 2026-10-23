import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import { repositoryFile } from '../../../util/testHelpers.js';

// discardComments runs in every preset, so each preset can disable it alike.
const commentedCSS = `/* note */h1{color:red}`;

/**
 * @param {import('postcss').AcceptedPlugin[]} plugins
 * @param {string} css
 * @returns {Promise<string>}
 */
async function minify(plugins, css) {
  const result = await postcss(plugins).process(css, {
    from: repositoryFile,
  });
  return result.css;
}

/** @type {[string, (options: object) => import('postcss').AcceptedPlugin[]][]} */
const presets = [
  ['lite', litePreset],
  ['default', defaultPreset],
  ['advanced', advancedPreset],
];

describe('plugin enablement shared by every preset', () => {
  for (const [name, preset] of presets) {
    test(`${name}: an empty options object runs the plugin with its defaults`, async () => {
      assert.strictEqual(
        await minify(
          preset({ options: { discardComments: {} } }),
          commentedCSS
        ),
        await minify(preset(), commentedCSS)
      );
    });

    test(`${name}: disable leaves the plugin out`, async () => {
      assert.strictEqual(
        await minify(preset({ disable: ['discardComments'] }), commentedCSS),
        '/* note */h1{color:red}'
      );
    });

    test(`${name}: a plugin that the preset does not have throws, because a misspelled name would otherwise go unnoticed`, () => {
      assert.throws(() => preset({ disable: ['notAPlugin'] }), {
        message:
          '"notAPlugin" in disable is not a transform that the preset runs.',
      });
    });
  }
});

describe('plugins that a preset disables', () => {
  test('colormin, when disabled, leaves #ffffff unshortened, which the default preset shortens', async () => {
    const css = 'h1{color:#ffffff}';
    assert.strictEqual(
      await minify(defaultPreset({ disable: ['colormin'] }), css),
      'h1{color:#ffffff}'
    );
    assert.strictEqual(await minify(defaultPreset(), css), 'h1{color:#fff}');
  });
});
