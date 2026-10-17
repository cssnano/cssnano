import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {
  presetConfigureKey,
  presetEntriesKey,
} from './presets/presetEntries.js';
import { hasInlineOption, presetOf, validateOptions } from './options.js';
import isRecord from './utils/isRecord.js';
import workingDirectory from './utils/workingDirectory.js';
import defaultPreset from './presets/default.js';

/** @import {BuiltInPreset, NamedPreset} from './presets/presetEntries.js' */
/** @import {PresetOptions} from './presets/configurePlugins.js' */
/** @import {DefaultPluginOptions} from './presets/defaultPlugins.js' */
/** @import {LitePluginOptions} from './presets/litePlugins.js' */
/** @import {AdvancedPluginOptions} from './presets/advancedPlugins.js' */
/** @import {AcceptedPlugin} from 'postcss' */
/** @import {SharedTargets} from '#utils/browser-targets' */

/**
 * A built preset with the plugins that it runs to disable or configure. Their
 * names are typed for that preset, so another preset's plugin is rejected.
 * @template {string} Name
 * @template {object} Plugins
 * @typedef {{preset: NamedPreset<Name, Plugins>} & Pick<PresetOptions<Plugins>, 'disable' | 'options'>} ConfiguredPreset
 */

/**
 * The options that a configuration file takes. The plugins to disable or
 * configure depend on the preset; without one, the default preset's apply.
 * @typedef {{browserslist?: SharedTargets} & (ConfiguredPreset<'default', DefaultPluginOptions> | ConfiguredPreset<'lite', LitePluginOptions> | ConfiguredPreset<'advanced', AdvancedPluginOptions> | ({preset?: undefined} & Pick<PresetOptions<DefaultPluginOptions>, 'disable' | 'options'>))} Config
 */

/**
 * The options of cssnano: the same keys as a configuration file, plus the
 * configuration file to read.
 * @typedef {{configFile?: string} & Config} Options
 */

const configFileName = 'cssnano.config.js';
// A JSON file once held the configuration; it is no longer read, so its presence throws.
const retiredFileName = '.cssnanorc.json';

/**
 * Validates options that are inline or in a configuration file. Without a
 * preset, the default preset runs, so its plugins are the ones that disable
 * and options may name. A preset that is not built in throws, because running
 * another preset would change the output the user asked for.
 *
 * @param {Record<string, unknown>} input
 * @param {'inline' | 'file'} place
 * @returns {Record<string, unknown>}
 */
export function validateConfig(input, place) {
  const preset = presetOf(input.preset) ?? defaultPreset;
  return validateOptions(input, place, preset[presetEntriesKey]);
}

/**
 * Turns validated options into the plugins they run. A named preset builds its
 * own plugins, so a copy of cssnano that built it also sets its browser targets.
 * Without a preset, the default preset of this copy applies.
 *
 * @param {Record<string, unknown>} validated the options, as validateConfig
 *   returns them
 * @returns {AcceptedPlugin[]}
 */
function pluginsFromOptions({ preset: named, ...presetOptions }) {
  const preset = /** @type {BuiltInPreset} */ (named ?? defaultPreset);
  return preset[presetConfigureKey](presetOptions);
}

/**
 * A configuration file is a JavaScript module, because a preset is a function
 * that must be imported. JSON cannot hold one, so it is rejected.
 *
 * @param {string} filePath
 * @returns {unknown}
 */
function loadConfigFile(filePath) {
  if (path.extname(filePath).toLowerCase() === '.json') {
    throw new TypeError(
      'JSON configuration files are not supported; write a cssnano.config.js module instead.'
    );
  }
  let config;
  try {
    config = createRequire(filePath)(filePath);
  } catch (error) {
    // Node loads the file synchronously, so its top-level await cannot settle.
    if (
      /** @type {{code?: string}} */ (error)?.code ===
      'ERR_REQUIRE_ASYNC_MODULE'
    ) {
      throw new Error(
        'uses top-level await, which cssnano cannot load, because it reads the configuration synchronously. Remove the top-level await, or write a CommonJS configuration.',
        { cause: error }
      );
    }
    throw error;
  }
  // A module compiled to CommonJS by Babel or TypeScript marks itself with __esModule.
  const isModule =
    config !== null &&
    typeof config === 'object' &&
    Object.prototype.toString.call(config) === '[object Module]';
  if (
    isModule ||
    (isRecord(config) && Reflect.get(config, '__esModule') === true)
  ) {
    if (!isRecord(config) || !('default' in config)) {
      throw new TypeError(
        'An ES module configuration must have a default export.'
      );
    }
    return config.default;
  }
  return config;
}

/**
 * Loads a configuration file and validates it. Errors name the file, so a user
 * can tell which file to fix, and keep their class, so a TypeError stays one.
 *
 * @param {string} name the file as the user named it
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
function validatedFromConfigFile(name, filePath) {
  try {
    const config = loadConfigFile(filePath);
    if (!isRecord(config)) {
      throw new TypeError('The configuration must be an object.');
    }
    return validateConfig(config, 'file');
  } catch (error) {
    throw namedError(name, error);
  }
}

/**
 * The errors whose message already names their file. Node rethrows the same
 * error each time a failed ES module is loaded again, so it is named only once.
 * @type {WeakSet<Error>}
 */
const namedErrors = new WeakSet();

/**
 * Prefixes the message of an error with the file, so the user can tell which
 * file to fix. The same object is returned, so its class and its properties,
 * such as code, stay, and its stack names the file too. An error that cannot
 * take a new message, such as a frozen one, or a value that is not an Error,
 * is wrapped in a new Error.
 *
 * @param {string} name the file as the user named it
 * @param {unknown} error what the configuration file threw
 * @returns {Error}
 */
function namedError(name, error) {
  if (!(error instanceof Error)) {
    return new Error(`${name}: ${String(error)}`, { cause: error });
  }
  if (namedErrors.has(error)) return error;
  const { message, stack } = error;
  const named = `${name}: ${message}`;
  if (!Reflect.set(error, 'message', named)) {
    return new Error(named, { cause: error });
  }
  namedErrors.add(error);
  // An engine formats the stack once, with the message it had then.
  const heading = message === '' ? error.name : `${error.name}: ${message}`;
  const at = stack?.indexOf(heading) ?? -1;
  if (stack !== undefined && at !== -1) {
    Reflect.set(
      error,
      'stack',
      `${stack.slice(0, at)}${error.name}: ${named}${stack.slice(at + heading.length)}`
    );
  }
  return error;
}

/**
 * @param {string} filePath
 * @returns {boolean} whether a regular file exists at the path
 */
function isFile(filePath) {
  return fs.statSync(filePath, { throwIfNoEntry: false })?.isFile() ?? false;
}

/**
 * Only the working directory is searched, because it holds the project being
 * built; parent directories may belong to another project.
 *
 * @returns {{fileName: string, filePath: string} | undefined} the configuration
 *   file found, or undefined when there is none
 */
function discoveredPath() {
  const directory = workingDirectory();
  if (directory === undefined) return undefined;
  const filePath = path.join(directory, configFileName);
  return isFile(filePath) ? { fileName: configFileName, filePath } : undefined;
}

/**
 * Throws when a retired JSON configuration file is discovered, because cssnano
 * would ignore its options and run the default preset.
 */
function assertNoRetiredFile() {
  const directory = workingDirectory();
  if (directory === undefined) return;
  if (isFile(path.join(directory, retiredFileName))) {
    throw new Error(
      `"${retiredFileName}" is not read; move its options to ${configFileName} and delete it.`
    );
  }
}

/**
 * The validated options of the configuration file that cssnano reads: the one
 * named by configFile, or else the one discovered in the working directory.
 *
 * @param {string | undefined} configFile
 * @returns {Record<string, unknown>} no options when there is no file
 */
function validatedFromFile(configFile) {
  if (configFile !== undefined) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (!isFile(configPath)) {
      throw new Error(
        `Cannot find cssnano configuration file "${configFile}".`
      );
    }
    return validatedFromConfigFile(configFile, configPath);
  }
  assertNoRetiredFile();
  const found = discoveredPath();
  return found === undefined
    ? {}
    : validatedFromConfigFile(found.fileName, found.filePath);
}

/**
 * Turns cssnano options into the plugins to run. Inline options replace the
 * configuration file, which is then not read, so browserslist sees one
 * consistent set of keys. Otherwise the configuration file named by configFile
 * is read, or else cssnano.config.js in the working directory. With neither,
 * cssnano runs the default preset.
 *
 * @param {Options} options
 * @returns {AcceptedPlugin[]}
 */
export function resolveOptions(options) {
  if (!isRecord(options)) {
    throw new TypeError('The cssnano options must be an object.');
  }
  const configFile = options.configFile ?? undefined;
  const inline = validateConfig(
    /** @type {Record<string, unknown>} */ (options),
    'inline'
  );
  if (hasInlineOption(inline)) {
    if (configFile !== undefined) {
      throw new Error(
        'Set either inline options or configFile, not both; inline options skip the configuration file.'
      );
    }
    return pluginsFromOptions(inline);
  }
  return pluginsFromOptions(validatedFromFile(configFile));
}
