import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import cssnano from '../src/index.js';
import { repositoryFile } from '../../../util/testHelpers.js';

const fixture = `h1{content:"©";color:#ff0000;z-index:10;display:grid}`;

/**
 * @param {import('postcss').AcceptedPlugin[] | Parameters<typeof cssnano>[0]} plugins
 *   a built preset, or cssnano options
 * @param {string} css
 */
async function minify(plugins, css = fixture) {
  const processor = Array.isArray(plugins)
    ? postcss(plugins)
    : postcss([cssnano(plugins)]);
  const result = await processor.process(css, { from: repositoryFile });
  return result.css;
}

describe('preset resolution', () => {
  test('uses the default preset when no preset is given', async () => {
    assert.strictEqual(await minify({}), await minify(defaultPreset()));
  });

  test('the imported lite preset given as preset runs the same plugins as the lite preset itself', async () => {
    assert.strictEqual(
      await minify({ preset: litePreset }),
      await minify(litePreset())
    );
  });

  test('the imported default preset given as preset runs the same plugins as the default preset itself', async () => {
    assert.strictEqual(
      await minify({ preset: defaultPreset }),
      await minify(defaultPreset())
    );
  });

  test('the imported advanced preset given as preset, with options, runs the same plugins as the preset with those options', async () => {
    const options = { disable: ['zindex'] };
    assert.strictEqual(
      await minify({ preset: advancedPreset, ...options }),
      await minify(advancedPreset(options))
    );
  });
});

describe('preset errors', () => {
  test('throws for a plugin list given as preset, since a preset is the function itself', () => {
    assert.throws(() => cssnano({ preset: litePreset() }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws for a preset array, which is not a preset function', () => {
    assert.throws(() => cssnano({ preset: ['lite', {}] }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws for a preset name string, because a preset is imported, not named', () => {
    assert.throws(() => cssnano({ preset: 'lite' }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws for a misspelled option, instead of running the default preset', () => {
    assert.throws(() => cssnano({ presett: 'lite' }), {
      message: '"presett" is not an option of cssnano options.',
    });
  });

  test('a built preset called with null throws a cssnano message, as cssnano(null) does', () => {
    assert.throws(() => litePreset(/** @type {any} */ (null)), {
      name: 'TypeError',
      message: 'The preset options must be an object.',
    });
  });
});

describe('plugin selection', () => {
  test('disable leaves out the named plugin', async () => {
    assert.strictEqual(
      await minify(
        { preset: advancedPreset, disable: ['zindex'] },
        `h1{z-index:10}`
      ),
      `h1{z-index:10}`
    );
  });

  test('a plugin that the advanced preset adds runs when no option disables it', async () => {
    assert.strictEqual(
      await minify({ preset: advancedPreset }, `h1{z-index:10}`),
      `h1{z-index:1}`
    );
  });

  test('options configure a plugin, such as the start index of zindex', async () => {
    assert.strictEqual(
      await minify(
        { preset: advancedPreset, options: { zindex: { startIndex: 15 } } },
        `h1{z-index:10}`
      ),
      `h1{z-index:15}`
    );
  });

  test('a plugin option, such as the ignore list of reduceInitial, reaches the plugin', async () => {
    const result = await cssnano({
      preset: defaultPreset,
      options: { reduceInitial: { ignore: ['pointer-events'] } },
    }).process('.selector { pointer-events: initial; }', {
      from: repositoryFile,
    });
    assert.strictEqual(result.css, '.selector{pointer-events:initial}');
  });

  test('should distinguish at-rule whitespace handling between lite and default presets', async () => {
    const input = '@media   (min-width: 1px) { h1 { color: red } }';

    assert.strictEqual(
      await minify(defaultPreset(), input),
      '@media(min-width:1px){h1{color:red}}'
    );
    assert.strictEqual(
      await minify(litePreset(), input),
      '@media (min-width: 1px){h1{color:red}}'
    );
  });
});
