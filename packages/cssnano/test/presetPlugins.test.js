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

  test('disable leaves out exactly the named plugin', () => {
    assert.deepStrictEqual(
      names(defaultPreset({ disable: ['discardComments'] })),
      names(defaultPreset()).filter(
        (name) => name !== 'postcss-discard-comments'
      )
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

  test('disabling merge leaves the cssnano-merge pass out', () => {
    assert.ok(
      !names(defaultPreset({ disable: ['merge'] })).includes('cssnano-merge')
    );
  });

  test('turning off rule merging keeps the cssnano-merge pass for longhand merging and duplicate removal', () => {
    assert.ok(
      names(defaultPreset({ options: { merge: { rules: false } } })).includes(
        'cssnano-merge'
      )
    );
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
