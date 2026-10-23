import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import {
  defaultPluginNames,
  pluginNameByOption,
  presetEntriesKey,
} from '../src/presets/presetEntries.js';

const presets = {
  default: defaultPreset,
  lite: litePreset,
  advanced: advancedPreset,
};

describe('plugin entries of the built-in presets', () => {
  for (const [name, preset] of Object.entries(presets)) {
    test(`every entry of the ${name} preset is a stage or transform entry, not a PostCSS creator`, () => {
      for (const [entry] of preset[presetEntriesKey]) {
        assert.notEqual(typeof entry, 'function');
        assert.equal(typeof entry.create, 'function');
      }
    });

    test(`the settings of each entry in the ${name} preset carry no PostCSS plugin name`, () => {
      for (const [, , settings] of preset[presetEntriesKey]) {
        assert.equal(Object.hasOwn(settings, 'postcssPlugin'), false);
      }
    });
  }

  test('the plugin name table names the PostCSS plugin behind every option of the built-in presets', () => {
    const options = new Set(
      Object.values(presets).flatMap((preset) =>
        preset[presetEntriesKey].map(([, option]) => option)
      )
    );
    assert.deepStrictEqual(
      Object.keys(pluginNameByOption).toSorted(),
      [...options].toSorted()
    );
  });

  test('the default plugin names are the option names of the default preset, so a top-level plugin name is recognised without loading it', () => {
    const optionNames = defaultPreset[presetEntriesKey].map(
      ([, option]) => option
    );
    assert.deepStrictEqual(
      optionNames.toSorted(),
      [...defaultPluginNames].toSorted()
    );
  });

  test('an option name has the same settings in every preset that runs it, so the schema can read them from one preset', () => {
    /** @type {Map<string, unknown>} */
    const settingsByOption = new Map();
    for (const preset of Object.values(presets)) {
      for (const [, option, settings] of preset[presetEntriesKey]) {
        if (!settingsByOption.has(option)) {
          settingsByOption.set(option, settings);
        } else {
          assert.deepEqual(settingsByOption.get(option), settings, option);
        }
      }
    }
  });
});
