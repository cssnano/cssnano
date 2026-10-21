import { validateOptions } from '../options.js';
import isRecord from '../utils/isRecord.js';
import { browserTargets } from '#utils/browser-targets';
import {
  presetConfigureKey,
  presetEntriesKey,
  presetNameKey,
} from './presetEntries.js';

/** @import {AcceptedPlugin} from 'postcss' */
/** @import {NamedPreset} from './presetEntries.js' */
/** @import {SharedTargets} from '#utils/browser-targets' */
/** @import {Guard} from '../optionGuards.js' */

/**
 * The options of a built preset: the same as cssnano, without the preset and
 * the configuration file.
 * @template {object} Plugins the options of each plugin the preset runs, keyed by its preset option
 * @typedef {object} PresetOptions
 * @property {SharedTargets} [browserslist]
 * @property {readonly (keyof Plugins)[]} [disable] plugins to leave out
 * @property {{[Name in keyof Plugins]?: Plugins[Name]}} [options] plugin name to the options that
 *   are merged over the plugin's defaults
 */

/**
 * A plugin in a preset: the PostCSS creator, the name of the entry, and its
 * settings. `targets` is set when the plugin reads the browser targets of its
 * preset; `defaults` are the options it uses unless the preset sets them;
 * `optionKeys` lists the options it accepts, so a key it does not declare can
 * be reported; `guards` checks the value of an option by its key.
 *
 * @typedef {{
 *   postcssPlugin: string,
 *   targets?: true,
 *   defaults?: object,
 *   optionKeys: readonly string[],
 *   guards?: Readonly<Record<string, Guard>>,
 * }} PluginEntrySettings
 */

/**
 * @typedef {import('postcss').PluginCreator<any>} PluginCreator
 */

/**
 * A plugin in a preset, the preset option that enables it, and its settings.
 * @typedef {readonly [PluginCreator, string, PluginEntrySettings]} PluginEntry
 */

/**
 * Turns the options of a built preset into the plugins it runs. A disabled
 * plugin is left out. Options that the preset does not take throw.
 *
 * @param {readonly PluginEntry[]} entries
 * @param {Record<string, unknown>} options
 * @returns {AcceptedPlugin[]}
 */
export function configurePlugins(entries, options) {
  return configureValidated(
    entries,
    validateOptions(options, 'preset', entries)
  );
}

/**
 * The same as configurePlugins, for options that validateOptions has already
 * checked against these entries, so the caller does not validate them twice.
 *
 * @param {readonly PluginEntry[]} entries
 * @param {Record<string, unknown>} known the validated options, without preset
 * @returns {AcceptedPlugin[]}
 */
export function configureValidated(entries, known) {
  const {
    browserslist = {},
    disable = [],
    options: pluginOptions = {},
  } = /** @type {{browserslist?: object, disable?: string[], options?: Record<string, object>}} */ (
    known
  );
  // Browser targets are cssnano-wide, so every target-reading plugin gets the same ones.
  const targets = Object.freeze({ ...browserslist });
  const disabled = new Set(/** @type {string[]} */ (disable));
  /** @type {AcceptedPlugin[]} */
  const plugins = [];
  for (const [creator, name, settings] of entries) {
    if (disabled.has(name)) continue;
    plugins.push(
      creator({
        ...settings.defaults,
        ...pluginOptions[name],
        ...(settings.targets ? { [browserTargets]: targets } : undefined),
      })
    );
  }
  return plugins;
}

/**
 * Builds a built-in preset function, tagged with its name and the plugins it
 * runs, so cssnano can read them from the function the user imported. The
 * caller's type annotation supplies the options of each plugin.
 *
 * @template {string} Name
 * @template {object} Plugins
 * @param {Name} name
 * @param {readonly PluginEntry[]} entries
 * @returns {NamedPreset<Name, Plugins>}
 */
export function definePreset(name, entries) {
  /** @param {PresetOptions<Plugins>} [options] */
  const preset = (options = {}) => {
    if (!isRecord(options)) {
      throw new TypeError('The preset options must be an object.');
    }
    return configurePlugins(entries, options);
  };
  return Object.assign(preset, {
    [presetEntriesKey]: entries,
    [presetNameKey]: name,
    [presetConfigureKey]: (/** @type {Record<string, unknown>} */ known) =>
      configureValidated(entries, known),
  });
}
