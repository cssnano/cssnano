import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import { repositoryFile } from '../../../util/testHelpers.js';

const names = (plugins) => plugins.map((plugin) => plugin.postcssPlugin);

describe('built presets return plugins', () => {
  test('every plugin of each preset is already instantiated', () => {
    for (const preset of [defaultPreset, litePreset, advancedPreset]) {
      for (const plugin of preset()) {
        assert.equal(typeof plugin.postcssPlugin, 'string');
      }
    }
  });

  test('the default preset runs one host plugin, with or without a disabled transform', () => {
    assert.deepStrictEqual(names(defaultPreset()), ['cssnano-host']);
    assert.deepStrictEqual(
      names(defaultPreset({ disable: ['discardComments'] })),
      ['cssnano-host']
    );
  });

  test('disabling colormin leaves the timing stage in its host plugin running', async () => {
    const css =
      'a{color:#ff0000;animation-timing-function:cubic-bezier(0.42,0,0.58,1)}';
    const result = await postcss(
      defaultPreset({ disable: ['colormin'] })
    ).process(css, { from: repositoryFile });
    assert.match(result.css, /#ff0000/v);
    assert.match(result.css, /ease-in-out/v);
  });

  test('disabling uniqueSelectors keeps the duplicate selector that the preset removes', async () => {
    const css = 'a,a{color:red}';
    const kept = await postcss(
      defaultPreset({ disable: ['uniqueSelectors', 'minifySelectors'] })
    ).process(css, { from: repositoryFile });
    const removed = await postcss(
      defaultPreset({ disable: ['minifySelectors'] })
    ).process(css, { from: repositoryFile });
    assert.equal(kept.css, 'a,a{color:red}');
    assert.equal(removed.css, 'a{color:red}');
  });

  test('disabling discardEmpty still removes the duplicate selector', async () => {
    const { css } = await postcss(
      defaultPreset({ disable: ['discardEmpty', 'minifySelectors'] })
    ).process('a,a{color:red}', { from: repositoryFile });
    assert.equal(css, 'a{color:red}');
  });

  test('rawCache is recorded on the root by the host', async () => {
    const result = await postcss(defaultPreset()).process('a{color:red}', {
      from: repositoryFile,
    });
    assert.equal(result.root.rawCache?.colon, ':');
  });

  test('disabling discardEmpty keeps the empty rule that the preset removes', async () => {
    const css = 'a{}b{color:red}';
    const kept = await postcss(
      defaultPreset({ disable: ['discardEmpty'] })
    ).process(css, { from: repositoryFile });
    const removed = await postcss(defaultPreset()).process(css, {
      from: repositoryFile,
    });
    assert.equal(removed.css, 'b{color:red}');
    assert.equal(kept.css, 'a{}b{color:red}');
  });

  test('turning off rule merging keeps the merge pass for longhand merging', async () => {
    const { css } = await postcss(
      defaultPreset({ options: { merge: { rules: false } } })
    ).process(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      {
        from: repositoryFile,
      }
    );
    assert.equal(css, 'a{margin:1px}');
  });

  test('options reach the plugin, merged over its defaults', async () => {
    const css = '/*! keep */a{color:red}';
    const kept = await postcss(defaultPreset()).process(css, {
      from: repositoryFile,
    });
    const removed = await postcss(
      defaultPreset({ options: { discardComments: { removeAll: true } } })
    ).process(css, { from: repositoryFile });
    assert.match(kept.css, /keep/v);
    assert.doesNotMatch(removed.css, /keep/v);
  });
});
