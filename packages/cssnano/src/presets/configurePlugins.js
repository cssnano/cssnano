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
/** @import {StageEntry, HostMember, PassRun, SymbolTransform, TransformEntry} from '../pipeline/host.js' */

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
 * A plugin in a preset: its stage or transform entry, the name of the entry,
 * and its settings. `targets` is set when the plugin reads the browser targets
 * of its preset; `defaults` are the options it uses unless the preset sets them;
 * `optionKeys` lists the options it accepts, so a key it does not declare can
 * be reported; `guards` checks the value of an option by its key. `walk` is
 * set when a stylesheet walk implements part of the plugin, so the walk of the
 * run receives its options under the entry name. `after` is set when the walk
 * after merge of the run implements it too; a stage entry with `after` also
 * puts its options in that walk.
 *
 * `transform` is set when the entry is a whole-stylesheet transform, so its entry
 * is a TransformEntry rather than a creator or a stage. A transform with `pass`
 * runs as a pass after the walk of its run, instead of inside the walk. A
 * transform with `after` runs in the walk after the passes of its run. A
 * transform with `symbols` runs over the lists that walk collects.
 *
 * @typedef {{
 *   targets?: true,
 *   defaults?: object,
 *   optionKeys: readonly string[],
 *   guards?: Readonly<Record<string, Guard>>,
 *   walk?: true,
 *   transform?: true,
 *   pass?: PassRun['pass'],
 *   after?: true,
 *   symbols?: SymbolTransform,
 * }} PluginEntrySettings
 */

/**
 * A plugin in a preset, the preset option that enables it, and its settings.
 * The first element is a stage entry, which the walk of the host runs, or a
 * transform entry, which the walk or the passes of the host run.
 * @typedef {readonly [StageEntry | TransformEntry, string, PluginEntrySettings]} PluginEntry
 */

/**
 * The stage members of a host, the options of the walk transforms that the
 * host's walk runs, the passes that run after it, and the options of the
 * transforms of the walk after the passes, and the advanced transforms over its lists.
 * @typedef {{members: HostMember[], transforms: Map<string, Record<PropertyKey, unknown>>, passes: Map<string, PassRun>, after: Map<string, Record<PropertyKey, unknown>>, symbols: Map<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>}} Run
 */

/** @returns {Run} */
function newRun() {
  return {
    members: [],
    transforms: new Map(),
    passes: new Map(),
    after: new Map(),
    symbols: new Map(),
  };
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
 * Files an enabled transform under the list that its settings name: a pass, a
 * symbol transform, the walk after merge or the walk. A transform that creates
 * null is off, so it is not filed.
 *
 * @param {Run} run
 * @param {string} name
 * @param {TransformEntry} entry
 * @param {Record<PropertyKey, unknown>} options
 * @param {PluginEntrySettings} settings
 */
function addTransform(run, name, entry, options, settings) {
  const transform = entry.create(options);
  if (transform === null) return;
  if (settings.pass) {
    run.passes.set(name, {
      pass: settings.pass,
      options: transform,
      targets: Boolean(settings.targets),
    });
  } else if (settings.symbols) {
    run.symbols.set(name, { transform: settings.symbols, options: transform });
  } else if (settings.after) {
    run.after.set(name, transform);
  } else {
    run.transforms.set(name, transform);
  }
}

/**
 * @param {Run} run
 * @returns {boolean} whether the run has nothing to host
 */
function isEmptyRun(run) {
  return (
    run.members.length === 0 &&
    run.transforms.size === 0 &&
    run.passes.size === 0 &&
    run.after.size === 0 &&
    run.symbols.size === 0
  );
}

/**
 * The same as configurePlugins, for options that validateOptions has already
 * checked against these entries, so the caller does not validate them twice.
 * The entries of a preset run in one host plugin, which walks the stylesheet
 * once for its stages and transforms.
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
  const run = newRun();
  for (const [entry, name, settings] of entries) {
    if (disabled.has(name)) continue;
    const options = {
      ...settings.defaults,
      ...pluginOptions[name],
      ...(settings.targets ? { [browserTargets]: targets } : undefined),
    };
    if (settings.transform) {
      addTransform(
        run,
        name,
        /** @type {TransformEntry} */ (entry),
        options,
        settings
      );
      continue;
    }
    if (settings.walk) run.transforms.set(name, options);
    if (settings.after) run.after.set(name, options);
    run.members.push({
      entry: /** @type {StageEntry} */ (entry),
      options,
      targets: Boolean(settings.targets),
    });
  }
  if (isEmptyRun(run)) return [];
  return [
    hostPlugin(run.members, run.transforms, run.passes, run.after, run.symbols),
  ];
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
