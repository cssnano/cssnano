import isRecord from './utils/isRecord.js';
import {
  advancedOnlyPluginNames,
  defaultPluginNames,
  presetConfigureKey,
  presetEntriesKey,
} from './presets/presetEntries.js';
import {
  assertValid,
  isAbsent,
  isNonEmptyString,
  isPluginEntries,
  isStringList,
} from './optionGuards.js';
import { validateBrowserslist } from './browserslistOptions.js';

/** @import {PluginEntry, PluginEntrySettings} from './presets/configurePlugins.js' */
/** @import {BuiltInPreset} from './presets/presetEntries.js' */
/** @import {Guard} from './optionGuards.js' */

/**
 * The places a key can be written: inline in cssnano(), in a configuration
 * file, or in the options of a built preset.
 * @typedef {'inline' | 'file' | 'preset'} Place
 */

const everywhere = /** @type {const} */ (['inline', 'file', 'preset']);

const placeLabels = /** @type {const} */ ({
  inline: 'cssnano options',
  file: 'a configuration file',
  preset: 'a built preset',
});

/**
 * The keys that moved or were removed, each with where its setting went. A key
 * that a user still writes throws, because ignoring it would change the output
 * the user asked for: a plugin they added would not run, or the browser
 * targets would widen.
 * @type {Readonly<Record<string, string>>}
 */
const removedOptions = Object.freeze({
  plugins: 'configure additional PostCSS plugins in your PostCSS configuration',
  svgo: 'run postcss-svgo before cssnano',
  overrideBrowserslist: 'set browserslist.query instead',
  env: 'set browserslist.env instead',
  stats: 'set browserslist.stats instead',
  path: 'set browserslist.path instead',
  mergeLonghand:
    'disable merge instead; longhand merging and duplicate removal now run together, and disabling merge also turns off rule merging',
  discardDuplicates:
    'disable merge instead; longhand merging and duplicate removal now run together, and disabling merge also turns off rule merging',
  mergeRules: 'set options.merge.rules to false instead',
});

/**
 * @param {string} key a key of removedOptions
 * @param {string} location where the key was written, such as " in disable",
 *   or empty at the top level
 * @returns {string}
 */
function removedMessage(key, location) {
  return `"${key}"${location} was removed; ${removedOptions[key]}.`;
}

/**
 * An empty list or object sets nothing, so it is unset too.
 * @param {unknown} value
 * @returns {boolean}
 */
const isUnset = (value) =>
  isAbsent(value) ||
  (Array.isArray(value) && value.length === 0) ||
  (isRecord(value) && Object.keys(value).length === 0);

/**
 * The top-level keys. Each has the places that accept it and the guard its
 * value must pass; a known key that fails its guard throws.
 */
/** @type {Readonly<Record<string, Guard & {places: readonly Place[]}>>} */
const optionTable = Object.freeze({
  preset: {
    places: /** @type {readonly Place[]} */ (['inline', 'file']),
    isValid: (/** @type {unknown} */ value) => isBuiltInPreset(value),
    expected:
      "a preset imported from cssnano, such as import lite from 'cssnano/presets/lite'",
  },
  browserslist: {
    places: everywhere,
    isValid: isRecord,
    expected: 'an object',
  },
  disable: {
    places: everywhere,
    isValid: isStringList,
    expected: 'an array of strings',
  },
  options: {
    places: everywhere,
    isValid: isRecord,
    expected: 'an object',
  },
  configFile: {
    places: /** @type {readonly Place[]} */ (['inline']),
    isValid: isNonEmptyString,
    expected: 'a non-empty string',
  },
});

/**
 * Whether validated options set something that replaces the configuration
 * file: any option with a value, other than configFile. Validation has already
 * dropped absent entries, so a plugin option written as undefined sets nothing.
 *
 * @param {Record<string, unknown>} options the validated options
 * @returns {boolean}
 */
export function hasInlineOption(options) {
  return Object.keys(options).some(
    (key) => key !== 'configFile' && !isUnset(options[key])
  );
}

/** The presets whose entries passed isPluginEntries, so each is walked once. */
const checkedPresets = new WeakSet();

/**
 * Whether a value is a built-in preset function, which carries the plugins it
 * runs and the builder for them. A preset name, an array or a plain function
 * is not one.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isBuiltInPreset(value) {
  if (typeof value !== 'function') return false;
  if (checkedPresets.has(value)) return true;
  const isPreset =
    Object.hasOwn(value, presetEntriesKey) &&
    Object.hasOwn(value, presetConfigureKey) &&
    typeof Reflect.get(value, presetConfigureKey) === 'function' &&
    isPluginEntries(Reflect.get(value, presetEntriesKey));
  if (isPreset) checkedPresets.add(value);
  return isPreset;
}

/**
 * Checks the preset before the other options, because the preset decides which
 * plugins they are checked against. A preset is a function imported from
 * cssnano, so a preset name, an array or a JSON value is rejected.
 *
 * @param {unknown} value the preset as the user wrote it
 * @returns {BuiltInPreset | undefined} the preset, or undefined when it is absent
 */
export function presetOf(value) {
  if (isAbsent(value)) return undefined;
  assertValid(optionTable.preset, value, 'preset');
  return /** @type {BuiltInPreset} */ (value);
}

/**
 * Validates the options of one place. A key whose value is null or undefined
 * is absent. Anything else that cssnano does not know throws, because ignoring
 * it would run something other than what the user asked for. A plugin name
 * counts only when the preset that runs it has the plugin.
 *
 * @param {Record<string, unknown>} input the options as the user wrote them
 * @param {Place} place where the options are written
 * @param {readonly PluginEntry[]} entries the plugins of the preset that runs
 * @returns {Record<string, unknown>} the validated options
 */
export function validateOptions(input, place, entries) {
  /** @type {Record<string, unknown>} */
  const options = {};

  for (const [key, value] of Object.entries(input)) {
    if (isAbsent(value)) continue;
    if (Object.hasOwn(removedOptions, key)) {
      throw new TypeError(`Option ${removedMessage(key, '')}`);
    }
    const isKnown = Object.hasOwn(optionTable, key);
    if (!isKnown && key === 'exclude') {
      throw new TypeError(
        '"exclude" is not an option of cssnano options; list the plugins to turn off in disable.'
      );
    }
    // A built-in plugin written at the top level would be dropped, whichever preset runs.
    if (
      !isKnown &&
      (defaultPluginNames.some((name) => name === key) ||
        advancedOnlyPluginNames.some((name) => name === key))
    ) {
      throw new TypeError(
        `"${key}" is a plugin, not an option; use disable: ["${key}"] to turn it off or options.${key} to configure it.`
      );
    }
    if (!isKnown || !optionTable[key].places.includes(place)) {
      throw new TypeError(
        `"${key}" is not an option of ${placeLabels[place]}.`
      );
    }
    assertValid(optionTable[key], value, key);
    options[key] = value;
  }

  if (options.browserslist !== undefined) {
    options.browserslist = validateBrowserslist(
      /** @type {Record<string, unknown>} */ (options.browserslist)
    );
  }

  if (options.disable !== undefined) {
    options.disable = validateDisable(
      /** @type {string[]} */ (options.disable),
      entries
    );
  }

  if (options.options !== undefined) {
    options.options = validatePluginOptions(
      /** @type {Record<string, unknown>} */ (options.options),
      entries
    );
  }

  checkContradictions(options);
  return options;
}

/**
 * @param {readonly PluginEntry[]} entries
 * @param {string} name a plugin option name, such as "colormin"
 * @returns {PluginEntrySettings | undefined}
 *   the settings of the plugin, or undefined when the preset does not run it
 */
function settingsOf(entries, name) {
  return entries.find(([, option]) => option === name)?.[2];
}

/**
 * @param {string[]} names
 * @param {readonly PluginEntry[]} entries
 * @returns {string[]} the names, all of plugins that the preset runs
 */
function validateDisable(names, entries) {
  for (const name of names) {
    if (Object.hasOwn(removedOptions, name)) {
      throw new TypeError(removedMessage(name, ' in disable'));
    }
    if (settingsOf(entries, name) === undefined) {
      throw new TypeError(
        `"${name}" in disable is not a transform that the preset runs.`
      );
    }
  }
  return names;
}

/**
 * @param {Record<string, unknown>} pluginOptions
 * @param {readonly PluginEntry[]} entries
 * @returns {Record<string, Record<string, unknown>>}
 */
function validatePluginOptions(pluginOptions, entries) {
  /** @type {Record<string, Record<string, unknown>>} */
  const known = {};
  for (const [name, value] of Object.entries(pluginOptions)) {
    if (isAbsent(value)) continue;
    if (Object.hasOwn(removedOptions, name)) {
      throw new TypeError(removedMessage(name, ' in options'));
    }
    const settings = settingsOf(entries, name);
    if (settings === undefined) {
      throw new TypeError(
        `"${name}" in options is not a transform that the preset runs.`
      );
    }
    if (!isRecord(value)) {
      throw new TypeError(`Option "options.${name}" must be an object.`);
    }
    /** @type {Record<string, unknown>} */
    const kept = {};
    for (const [key, option] of Object.entries(value)) {
      if (isAbsent(option)) continue;
      if (settings.optionKeys.includes(key)) {
        const guard = settings.guards?.[key];
        if (guard !== undefined) {
          assertValid(guard, option, `options.${name}.${key}`);
        }
        kept[key] = option;
      } else if (key === 'exclude') {
        throw new TypeError(
          `"exclude" in options.${name} is not an option; use disable: ["${name}"] to turn the plugin off.`
        );
      } else if (Object.hasOwn(removedOptions, key)) {
        throw new TypeError(removedMessage(key, ` in options.${name}`));
      } else {
        throw new TypeError(`"${key}" in options.${name} is not an option.`);
      }
    }
    known[name] = kept;
  }
  return known;
}

/**
 * A plugin in both lists has no single meaning: disable turns it off, and the
 * options configure it.
 * @param {Record<string, unknown>} options
 */
function checkContradictions(options) {
  if (options.disable === undefined || options.options === undefined) return;
  for (const name of /** @type {string[]} */ (options.disable)) {
    if (Object.hasOwn(/** @type {object} */ (options.options), name)) {
      throw new Error(
        `Plugin "${name}" is in both disable and options; remove it from one of them.`
      );
    }
  }
}
