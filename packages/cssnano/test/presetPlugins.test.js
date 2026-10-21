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
      names(defaultPreset({ disable: ['colormin'] })),
      names(defaultPreset()).filter((name) => name !== 'postcss-colormin')
    );
  });

  test('disabling one merge transform keeps the cssnano-merge pass for the others', () => {
    for (const transform of [
      'mergeLonghand',
      'discardDuplicates',
      'mergeRules',
    ]) {
      assert.ok(
        names(defaultPreset({ disable: [transform] })).includes(
          'cssnano-merge'
        ),
        transform
      );
    }
  });

  test('disabling every merge transform leaves the cssnano-merge pass out', () => {
    assert.ok(
      !names(
        defaultPreset({
          disable: ['mergeLonghand', 'discardDuplicates', 'mergeRules'],
        })
      ).includes('cssnano-merge')
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
