import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';

const require = createRequire(import.meta.url);

/**
 * Built-in presets, used when no installed package matches the name. The
 * advanced preset loads on first use, so the default path stays small.
 *
 * @param {unknown} name
 * @param {any} options
 * @returns {PresetPlugin[] | undefined}
 */
function builtInPresetPlugins(name, options) {
  switch (name) {
    case 'cssnano-preset-default':
      return defaultPreset(options).plugins;
    case 'cssnano-preset-lite':
    case 'lite':
      return litePreset(options).plugins;
    case 'cssnano-preset-advanced':
    case 'advanced':
      return require('#presets/advanced')(options).plugins;
    default:
      return undefined;
  }
}

/** Built-in preset packages whose installed copy has not been reported yet. */
const unreportedPresetPackages = new Set([
  'cssnano-preset-default',
  'cssnano-preset-lite',
  'cssnano-preset-advanced',
]);

/**
 * Loads an installed preset package. When it shares a name with a built-in
 * preset, warn once: an outdated install would otherwise silently replace the
 * preset that ships with this version of cssnano.
 *
 * @param {string} moduleId
 * @param {string} modulePath
 * @param {any} options
 * @returns {PresetPlugin[]}
 */
function installedPresetPlugins(moduleId, modulePath, options) {
  if (unreportedPresetPackages.delete(moduleId)) {
    process.emitWarning(
      `cssnano is using the installed package "${moduleId}" (${modulePath}) instead of its built-in preset. ` +
        `Uninstall "${moduleId}" to use the built-in preset, or pass the imported preset function to keep the installed one.`,
      { code: 'CSSNANO_INSTALLED_PRESET' }
    );
  }
  return require(modulePath)(options).plugins;
}

const configFileNames = ['.cssnanorc.json', 'cssnano.config.js'];

/** @typedef {boolean | { exclude?: boolean } | void | undefined} PluginOptions */
/** @typedef {import('postcss').PluginCreator<any>} PluginCreator */
/** @typedef {[PluginCreator, PluginOptions]} PresetPlugin */
/** @typedef {(options?: any) => { plugins: PresetPlugin[] }} PresetFactory */
/** @typedef {string | PresetFactory | [string | PresetFactory, object] | { plugins: PresetPlugin[] }} PresetSpec */
/** @typedef {string | PluginCreator | [string | PluginCreator, object?]} PluginSpec */
/** @typedef {{ preset?: PresetSpec, plugins?: PluginSpec[], configFile?: string }} Options */
/**
 * @param {string} moduleId
 * @returns {string | undefined} the resolved path, if the module is installed
 */
function resolveModule(moduleId) {
  try {
    return require.resolve(moduleId);
  } catch {
    return undefined;
  }
}

/**
 * preset can be one of four possibilities:
 * preset = 'default'
 * preset = ['default', {}]
 * preset = function <- to be invoked
 * preset = {plugins: []} <- already invoked function
 *
 * @param {unknown} preset
 * @return {PresetPlugin[]}
 */
function resolvePreset(preset) {
  let fn, options;

  if (Array.isArray(preset)) {
    fn = preset[0];
    options = preset[1];
  } else {
    fn = preset;
    options = {};
  }

  // For JS setups where we invoked the preset already
  if (typeof fn === 'object' && fn !== null && 'plugins' in fn) {
    return fn.plugins;
  }

  // Provide an alias for the default preset, as it is built-in.
  if (fn === 'default') {
    return defaultPreset(options).plugins;
  }

  // For non-JS setups; we'll need to invoke the preset ourselves.
  if (typeof fn === 'function') {
    return fn(options).plugins;
  }

  // The shorthands stand for the cssnano-preset-* packages only, never for an
  // unrelated package that happens to be called "lite" or "advanced".
  const moduleId =
    fn === 'lite' || fn === 'advanced' ? `cssnano-preset-${fn}` : fn;

  // Try loading a preset from node_modules
  const modulePath = resolveModule(moduleId);
  if (modulePath) {
    return installedPresetPlugins(moduleId, modulePath, options);
  }

  // An installed preset wins above; the built-in only fills in when none exists.
  const builtIn = builtInPresetPlugins(fn, options);
  if (builtIn) {
    return builtIn;
  }

  // If all else fails, we probably have a typo in the config somewhere
  throw new Error(
    `Cannot load preset "${fn}". Please check your configuration for errors and try again.`
  );
}

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function loadConfigFile(filePath) {
  if (filePath.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  const config = createRequire(filePath)(filePath);
  if (
    config !== null &&
    typeof config === 'object' &&
    Object.prototype.toString.call(config) === '[object Module]' &&
    'default' in config
  ) {
    return config.default;
  }
  return config;
}

/**
 * @param {string} [configFile]
 * @returns {unknown | null}
 */
function loadDiscoveredConfig(configFile) {
  if (configFile) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (!fs.existsSync(configPath)) {
      throw new Error(
        `Cannot find cssnano configuration file "${configFile}".`
      );
    }
    return loadConfigFile(configPath);
  }

  for (const fileName of configFileNames) {
    const configPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(configPath)) continue;
    return loadConfigFile(configPath);
  }
  return null;
}

/**
 * @param {Options} options
 * @returns {PresetPlugin[]}
 */
function resolveConfig(options) {
  if (options.preset) {
    if (
      Array.isArray(options.preset) &&
      /** @type {unknown[]} */ (options.preset).length === 0
    ) {
      return [];
    }
    return resolvePreset(options.preset);
  }
  if (Array.isArray(options.plugins)) return [];

  const config = loadDiscoveredConfig(options.configFile);
  const preset =
    config !== null && typeof config === 'object' && 'preset' in config
      ? config.preset
      : config;
  return resolvePreset(config === null ? 'default' : preset);
}

/**
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
function cssnanoPlugin(options = {}) {
  let nanoPlugins = resolveConfig(options);
  if (Array.isArray(options.plugins)) {
    nanoPlugins = nanoPlugins.slice();
    const inputPlugins = options.plugins;
    for (const plugin of inputPlugins) {
      if (Array.isArray(plugin)) {
        const [pluginDef, opts = {}] = plugin;
        if (typeof pluginDef === 'string' && resolveModule(pluginDef)) {
          nanoPlugins.push([
            /** @type {PluginCreator} */ (require(pluginDef)),
            opts,
          ]);
        } else {
          nanoPlugins.push([/** @type {PluginCreator} */ (pluginDef), opts]);
        }
      } else if (typeof plugin === 'string' && resolveModule(plugin)) {
        nanoPlugins.push([/** @type {PluginCreator} */ (require(plugin)), {}]);
      } else {
        nanoPlugins.push([/** @type {PluginCreator} */ (plugin), {}]);
      }
    }
  }
  const plugins = [];
  for (const nanoPlugin of nanoPlugins) {
    if (Array.isArray(nanoPlugin)) {
      const [processor, opts] = nanoPlugin;
      if (
        typeof opts === 'undefined' ||
        (typeof opts === 'object' && !opts.exclude) ||
        (typeof opts === 'boolean' && opts === true)
      ) {
        plugins.push(processor(opts));
      }
    } else {
      plugins.push(nanoPlugin);
    }
  }
  return postcss(plugins);
}

/** @type {true} */
cssnanoPlugin.postcss = true;

export { cssnanoPlugin as default, cssnanoPlugin as 'module.exports' };
