import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import { testTargets } from '../../../util/testHelpers.js';

const names = (plugins) => plugins.map((plugin) => plugin.postcssPlugin);

describe('built presets return plugins', () => {
  test('every plugin of each preset is already instantiated', () => {
    for (const preset of [defaultPreset, litePreset, advancedPreset]) {
      for (const plugin of preset({ browserslist: { query: testTargets } })) {
        assert.equal(typeof plugin.postcssPlugin, 'string');
      }
    }
  });

  test('the default preset runs one host plugin, with or without a disabled transform', () => {
    assert.deepStrictEqual(
      names(defaultPreset({ browserslist: { query: testTargets } })),
      ['cssnano-host']
    );
    assert.deepStrictEqual(
      names(
        defaultPreset({
          browserslist: { query: testTargets },
          disable: ['discardComments'],
        })
      ),
      ['cssnano-host']
    );
  });

  test('disabling colormin leaves the timing stage in its host plugin running', async () => {
    const css =
      'a{color:#ff0000;animation-timing-function:cubic-bezier(0.42,0,0.58,1)}';
    const result = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['colormin'],
      })
    ).process(css, { from: undefined });
    assert.match(result.css, /#ff0000/v);
    assert.match(result.css, /ease-in-out/v);
  });

  test('keeps a comment inside a value that the longhand merge leaves as it is, because comment removal is disabled', async () => {
    const result = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['discardComments'],
      })
    ).process('a{margin:1px/*c*/ 2px}', { from: undefined });
    assert.equal(result.css, 'a{margin:1px/*c*/ 2px}');
  });

  test('keeps a comment inside a value that a reducer other than the longhand merge leaves as it is, because comment removal is disabled', async () => {
    const result = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['discardComments'],
      })
    ).process('a{border:1px/*c*/ solid red}', { from: undefined });
    assert.equal(result.css, 'a{border:1px/*c*/ solid red}');
  });

  test('keeps the space before the semicolon of a value the longhand merge leaves as it is, because whitespace normalization is disabled', async () => {
    const result = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['normalizeWhitespace'],
      })
    ).process('a{border-radius:.5em ;}', { from: undefined });
    assert.equal(result.css, 'a{border-radius:.5em ;}');
  });

  test('disabling uniqueSelectors keeps the duplicate selector that the preset removes', async () => {
    const css = 'a,a{color:red}';
    const kept = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['uniqueSelectors', 'minifySelectors'],
      })
    ).process(css, { from: undefined });
    const removed = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['minifySelectors'],
      })
    ).process(css, { from: undefined });
    assert.equal(kept.css, 'a,a{color:red}');
    assert.equal(removed.css, 'a{color:red}');
  });

  test('disabling discardEmpty still removes the duplicate selector', async () => {
    const { css } = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['discardEmpty', 'minifySelectors'],
      })
    ).process('a,a{color:red}', { from: undefined });
    assert.equal(css, 'a{color:red}');
  });

  test('rawCache is recorded on the root by the host', async () => {
    const result = await postcss(
      defaultPreset({ browserslist: { query: testTargets } })
    ).process('a{color:red}', {
      from: undefined,
    });
    assert.equal(result.root.rawCache?.colon, ':');
  });

  test('disabling discardEmpty keeps the empty rule that the preset removes', async () => {
    const css = 'a{}b{color:red}';
    const kept = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        disable: ['discardEmpty'],
      })
    ).process(css, { from: undefined });
    const removed = await postcss(
      defaultPreset({ browserslist: { query: testTargets } })
    ).process(css, {
      from: undefined,
    });
    assert.equal(removed.css, 'b{color:red}');
    assert.equal(kept.css, 'a{}b{color:red}');
  });

  test('turning off rule merging keeps the merge pass for longhand merging', async () => {
    const { css } = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        options: { merge: { rules: false } },
      })
    ).process(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      {
        from: undefined,
      }
    );
    assert.equal(css, 'a{margin:1px}');
  });

  test('options reach the plugin, merged over its defaults', async () => {
    const css = '/*! keep */a{color:red}';
    const kept = await postcss(
      defaultPreset({ browserslist: { query: testTargets } })
    ).process(css, {
      from: undefined,
    });
    const removed = await postcss(
      defaultPreset({
        browserslist: { query: testTargets },
        options: { discardComments: { removeAll: true } },
      })
    ).process(css, { from: undefined });
    assert.match(kept.css, /keep/v);
    assert.doesNotMatch(removed.css, /keep/v);
  });
});
