import { validateOptions } from '../options.js';
import { hostPlugin } from '../pipeline/host.js';
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
/** @import {StageEntry, HostMember} from '../pipeline/host.js' */

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
 * be reported; `guards` checks the value of an option by its key. `stage` is a
 * stage the run takes just before the plugin, so the plugin ends that run with
 * it. `walk` is set when a stylesheet walk implements part of the plugin, so
 * the walk of the run receives its options under the entry name while the
 * plugin still runs.
 *
 * @typedef {{
 *   postcssPlugin: string,
 *   targets?: true,
 *   defaults?: object,
 *   optionKeys: readonly string[],
 *   guards?: Readonly<Record<string, Guard>>,
 *   stage?: StageEntry,
 *   walk?: true,
 * }} PluginEntrySettings
 */

/**
 * @typedef {import('postcss').PluginCreator<any>} PluginCreator
 */

/**
 * A plugin in a preset, the preset option that enables it, and its settings.
 * The first element is either a PostCSS plugin creator, which runs as its own
 * plugin, or a stage entry, which runs in a host plugin with the stages of the
 * adjacent stage entries.
 * @typedef {readonly [PluginCreator | StageEntry, string, PluginEntrySettings]} PluginEntry
 */

/**
 * The stage members of a host, and the options of the walk transforms that
 * the host's walk runs.
 * @typedef {{members: HostMember[], transforms: Map<string, Record<PropertyKey, unknown>>}} Run
 */

/** @returns {Run} */
function newRun() {
  return { members: [], transforms: new Map() };
}

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
 * Each run of adjacent enabled stage entries becomes one host plugin, which
 * builds its stages as it processes a stylesheet. A plugin creator that runs
 * ends the run, so the stages keep their order.
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
  /** @type {Run} */
  let run = newRun();
  const endRun = () => {
    if (run.members.length > 0 || run.transforms.size > 0) {
      plugins.push(hostPlugin(run.members, run.transforms));
    }
    run = newRun();
  };
  for (const [entry, name, settings] of entries) {
    if (disabled.has(name)) continue;
    const options = {
      ...settings.defaults,
      ...pluginOptions[name],
      ...(settings.targets ? { [browserTargets]: targets } : undefined),
    };
    if (settings.walk) run.transforms.set(name, options);
    if (settings.stage) {
      run.members.push({ entry: settings.stage, options, targets: false });
    }
    if (typeof entry === 'function') {
      endRun();
      plugins.push(entry(options));
    } else {
      run.members.push({ entry, options, targets: Boolean(settings.targets) });
    }
  }
  endRun();
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
