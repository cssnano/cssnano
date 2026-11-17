import { validateOptions } from '../options.js';
import { hostPlugin } from '../run/host.js';
import { hostPlan, isEmptyPlan } from '../run/hostPlan.js';
import isRecord from '../utils/isRecord.js';
import {
  presetConfigureKey,
  presetEntriesKey,
  presetNameKey,
} from './presetEntries.js';

/** @import {AcceptedPlugin} from 'postcss' */
/** @import {NamedPreset} from './presetEntries.js' */
/** @import {SharedTargets} from '#utils/browser-targets' */
/** @import {Guard} from '../optionGuards.js' */
/** @import {StageEntry, HostMember, SymbolEntry, SymbolTransform, TransformEntry} from '../run/host.js' */
/** @import {RunPlan, TransformField} from '../run/hostPlan.js' */
/** @import {MergeRunner} from '../merge/index.js' */

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
 * be reported; `guards` checks the value of an option by its key.
 *
 * `field` is the field of the run plan that the entry fills with its options: a
 * stage that a walk reads, or a transform that the walk runs. `transform` is set
 * when the entry is a whole-stylesheet transform, so its entry is a
 * TransformEntry rather than a creator or a stage. A transform with `merge`
 * is the merge run, which runs between the walk down of its host and the walk
 * up. A transform with `symbols` runs over the lists that walk collects; every
 * other transform fills its `field`.
 *
 * @typedef {{
 *   targets?: true,
 *   defaults?: object,
 *   optionKeys: readonly string[],
 *   guards?: Readonly<Record<string, Guard>>,
 *   field?: TransformField,
 *   transform?: true,
 *   merge?: MergeRunner,
 *   symbols?: SymbolTransform,
 * }} PluginEntrySettings
 */

/**
 * A plugin in a preset, the preset option that enables it, and its settings.
 * The first element is a stage entry, which the walk of the host runs, or a
 * transform entry, which the walk or the merge of the host run.
 * @typedef {readonly [StageEntry | TransformEntry, string, PluginEntrySettings]} PluginEntry
 */

/**
 * The keys of an options type, or none when it is an open record, which names
 * no key that a list could be checked against.
 * @template Options
 * @typedef {string extends keyof Options ? never : keyof Options & string} NamedKeys
 */

/**
 * The entry of one preset option. An entry is checked against it with
 * `@satisfies`, so that its creator accepts the options the preset documents
 * for the name and `optionKeys` names only keys of those options. A misspelled
 * key then fails where it is written, and the literal types stay.
 * @template {object} Options
 * @template {keyof Options & string} Name
 * @typedef {readonly [StageEntry<NonNullable<Options[Name]>> | TransformEntry<NonNullable<Options[Name]>>, Name, PluginEntrySettings & {readonly optionKeys: readonly NamedKeys<NonNullable<Options[Name]>>[]}]} EntryFor
 */

/**
 * The run plan being filled. Its stage members and symbol transforms are arrays
 * that the entries append to; the other fields are set once each.
 *
 * @typedef {{members: HostMember[], symbols: SymbolEntry[]} & Partial<Omit<RunPlan, 'members' | 'symbols'>>} RunDraft
 */

/**
 * Files an enabled transform under the plan field that its settings name, or
 * under the merge or the symbol transforms. A transform that creates null is
 * off, so it is not filed.
 *
 * @param {RunDraft} draft
 * @param {TransformEntry} entry
 * @param {Record<PropertyKey, unknown>} options
 * @param {PluginEntrySettings} settings
 */
function addTransform(draft, entry, options, settings) {
  const transform = entry.create(options);
  if (transform === null) return;
  if (settings.merge) {
    draft.merge = { options: transform, runner: settings.merge };
  } else if (settings.symbols) {
    draft.symbols.push({ transform: settings.symbols, options: transform });
  } else {
    draft[/** @type {TransformField} */ (settings.field)] = transform;
  }
}

/**
 * The run plan of the entries, for options that validateOptions has already
 * checked against them. A disabled plugin is left out. The entries of a preset
 * run in one host plugin, which walks the stylesheet once for its stages and
 * transforms.
 *
 * @param {readonly PluginEntry[]} entries
 * @param {Record<string, unknown>} known the validated options, without preset
 * @returns {RunPlan}
 */
export function planOf(entries, known) {
  const {
    browserslist,
    disable = [],
    options: pluginOptions = {},
  } = /** @type {{browserslist?: object, disable?: string[], options?: Record<string, object>}} */ (
    known
  );
  const disabled = new Set(/** @type {string[]} */ (disable));
  // Browser targets are cssnano-wide, so the plan names them once for every target-reading plugin.
  /** @type {RunDraft} */
  const draft = { members: [], symbols: [], browserslist };
  for (const [entry, name, settings] of entries) {
    if (disabled.has(name)) continue;
    const options = {
      ...settings.defaults,
      ...pluginOptions[name],
    };
    if (settings.transform) {
      addTransform(
        draft,
        /** @type {TransformEntry} */ (entry),
        options,
        settings
      );
      continue;
    }
    if (settings.field) draft[settings.field] = options;
    draft.members.push({
      entry: /** @type {StageEntry} */ (entry),
      options,
      targets: Boolean(settings.targets),
    });
  }
  return hostPlan(draft);
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
 *
 * @param {readonly PluginEntry[]} entries
 * @param {Record<string, unknown>} known the validated options, without preset
 * @returns {AcceptedPlugin[]}
 */
export function configureValidated(entries, known) {
  const plan = planOf(entries, known);
  return isEmptyPlan(plan) ? [] : [hostPlugin(plan)];
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
