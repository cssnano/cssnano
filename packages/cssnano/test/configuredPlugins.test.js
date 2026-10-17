import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { configurePlugins } from '../src/presets/configurePlugins.js';
import { browserTargets } from '../src/utils/browserTargets.js';
import { advancedPresetEntries } from '../src/presets/advancedPlugins.js';
import { defaultPluginEntries } from '../src/presets/defaultPlugins.js';
import { litePluginEntries } from '../src/presets/litePlugins.js';

// Browser targets that a preset shares with its target-reading plugins.
const browserslist = { query: 'defaults', env: 'production', stats: 'x' };

/**
 * Replaces each creator with one that records the options it runs with, so the
 * test sees the configuration before any plugin is built.
 *
 * @param {readonly unknown[][]} entries
 * @returns {{entries: unknown[][], calls: {name: string, options: Record<PropertyKey, unknown>}[]}}
 */
function recording(entries) {
  /** @type {{name: string, options: Record<PropertyKey, unknown>}[]} */
  const calls = [];
  const recorded = entries.map(([, name, settings]) => [
    (/** @type {Record<PropertyKey, unknown>} */ options) => {
      calls.push({ name: /** @type {string} */ (name), options });
      return { postcssPlugin: name };
    },
    name,
    settings,
  ]);
  return { entries: recorded, calls };
}

/**
 * @param {readonly unknown[][]} entries
 * @param {object} options
 */
function configuredCalls(entries, options) {
  const { entries: recorded, calls } = recording(entries);
  configurePlugins(
    /** @type {Parameters<typeof configurePlugins>[0]} */ (recorded),
    options
  );
  return calls;
}

const presets = {
  default: defaultPluginEntries,
  lite: litePluginEntries,
  advanced: advancedPresetEntries,
};

describe('plugins configured by each preset', () => {
  for (const [presetName, entries] of Object.entries(presets)) {
    test(`${presetName} preset runs each plugin with the defaults its entry declares`, () => {
      for (const { name, options } of configuredCalls(entries, {})) {
        const [, , settings] = entries.find(([, option]) => option === name);
        // A target-reading plugin gets the preset's targets, which are empty when none are given.
        const expected = settings.targets
          ? { ...settings.defaults, [browserTargets]: {} }
          : { ...settings.defaults };
        assert.deepStrictEqual(options, expected, name);
      }
    });

    test(`${presetName} preset gives the browser targets only to plugins that read them`, () => {
      for (const { name, options } of configuredCalls(entries, {
        browserslist,
      })) {
        const [, , settings] = entries.find(([, option]) => option === name);
        if (settings.targets) {
          assert.deepStrictEqual(options[browserTargets], browserslist, name);
        } else {
          assert.equal(options[browserTargets], undefined, name);
        }
      }
    });

    test(`${presetName} preset configures every plugin except the one it disables`, () => {
      for (const [, disabled] of entries) {
        const names = configuredCalls(entries, { disable: [disabled] }).map(
          ({ name }) => name
        );
        const expected = entries
          .map(([, option]) => option)
          .filter((option) => option !== disabled);
        assert.deepStrictEqual(names, expected, disabled);
      }
    });

    test(`${presetName} preset lets options replace each plugin's declared keys`, () => {
      for (const [, option, settings] of entries) {
        const [key] = settings.optionKeys;
        if (key === undefined) continue;
        const call = configuredCalls(entries, {
          options: { [option]: { [key]: 'replaced' } },
        }).find(({ name }) => name === option);
        assert.equal(call.options[key], 'replaced', option);
      }
    });
  }

  test('mergeLonghand, listed twice, is configured with the same options both times', () => {
    const plugins = configuredCalls(defaultPluginEntries, {
      options: { mergeLonghand: {} },
    }).filter(({ name }) => name === 'mergeLonghand');

    assert.equal(plugins.length, 2);
    assert.deepStrictEqual(plugins[0], plugins[1]);
  });

  test('a key listed twice in the default entries has the same plugin and settings both times', () => {
    for (const [key, [first, ...rest]] of Map.groupBy(
      defaultPluginEntries,
      ([, optionKey]) => optionKey
    )) {
      for (const [creator, , settings] of rest) {
        assert.strictEqual(creator, first[0], `${key} plugin`);
        assert.deepStrictEqual(settings, first[2], `${key} settings`);
      }
    }
  });
});
