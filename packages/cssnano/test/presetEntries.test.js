import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import {
  defaultPluginNames,
  presetEntriesKey,
} from '../src/presets/presetEntries.js';

const presets = {
  default: defaultPreset,
  lite: litePreset,
  advanced: advancedPreset,
};

describe('plugin entries of the built-in presets', () => {
  for (const [name, preset] of Object.entries(presets)) {
    test(`the ${name} preset names the PostCSS plugin that each of its creator entries makes`, () => {
      for (const [creator, , settings] of preset[presetEntriesKey]) {
        // A stage entry builds no PostCSS plugin of its own, so its name is not checked here.
        if (typeof creator !== 'function') continue;
        assert.equal(settings.postcssPlugin, creator({}).postcssPlugin);
      }
    });
  }

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
