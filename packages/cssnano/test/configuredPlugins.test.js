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
 * Replaces each creator with one that records the options it is called with,
 * so the test sees the configuration before any plugin is built.
 *
 * @param {readonly unknown[][]} entries
 * @returns {{entries: unknown[][], calls: {name: string, options: Record<PropertyKey, unknown>}[]}}
 */
function recording(entries) {
  /** @type {{name: string, options: Record<PropertyKey, unknown>}[]} */
  const calls = [];
  const recorded = entries.map(([, option, settings]) => [
    settings.transform
      ? {
          create: (/** @type {Record<PropertyKey, any>} */ options) => {
            calls.push({ name: option, options: { ...options } });
            return options;
          },
        }
      : (/** @type {Record<PropertyKey, any>} */ options) => {
          calls.push({ name: option, options: { ...options } });
          return { postcssPlugin: settings.postcssPlugin };
        },
    option,
    settings,
  ]);
  return { entries: recorded, calls };
}

/**
 * The plugins of each entry, each with its option name and settings.
 *
 * @param {readonly unknown[][]} entries
 */
function pluginUnits(entries) {
  return entries.map(([, option, settings]) => ({
    name: /** @type {string} */ (option),
    .../** @type {Parameters<typeof configurePlugins>[0][number][2]} */ (
      settings
    ),
  }));
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
    const units = pluginUnits(entries);

    test(`${presetName} preset runs each plugin with the defaults its entry declares`, () => {
      for (const { name, options } of configuredCalls(entries, {})) {
        const settings = units.find((unit) => unit.name === name);
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
        const settings = units.find((unit) => unit.name === name);
        if (settings.targets) {
          assert.deepStrictEqual(options[browserTargets], browserslist, name);
        } else {
          assert.equal(options[browserTargets], undefined, name);
        }
      }
    });

    test(`${presetName} preset configures every plugin except the one it disables`, () => {
      for (const { name: disabled } of units) {
        const names = configuredCalls(entries, { disable: [disabled] }).map(
          ({ name }) => name
        );
        const expected = units
          .map(({ name }) => name)
          .filter((name) => name !== disabled);
        assert.deepStrictEqual(names, expected, disabled);
      }
    });

    test(`${presetName} preset lets options replace each plugin's declared keys`, () => {
      for (const { name, optionKeys, guards } of units) {
        const [key] = optionKeys;
        if (key === undefined) continue;
        // A guarded key takes a boolean, the only kind of value a guard in the presets accepts.
        const value = guards?.[key] ? false : 'replaced';
        const call = configuredCalls(entries, {
          options: { [name]: { [key]: value } },
        }).find((recorded) => recorded.name === name);
        assert.equal(call.options[key], value, name);
      }
    });
  }

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
