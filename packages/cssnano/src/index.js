import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import defaultPreset from 'cssnano-preset-default';

const require = createRequire(import.meta.url);

const configFileNames = [
  'package.json',
  '.cssnanorc.json',
  '.cssnanorc.js',
  'cssnano.config.js',
];

/** @typedef {boolean | { exclude?: boolean } | void | undefined} PluginOptions */
/** @typedef {import('postcss').PluginCreator<any>} PluginCreator */
/** @typedef {[PluginCreator, PluginOptions]} PresetPlugin */
/** @typedef {(options?: any) => { plugins: PresetPlugin[] }} PresetFactory */
/** @typedef {string | PresetFactory | [string | PresetFactory, object] | { plugins: PresetPlugin[] }} PresetSpec */
/** @typedef {string | PluginCreator | [string | PluginCreator, object?]} PluginSpec */
/** @typedef {{ preset?: PresetSpec, plugins?: PluginSpec[], configFile?: string }} Options */
/**
 * @param {string} moduleId
 * @returns {boolean}
 */
function isResolvable(moduleId) {
  try {
    require.resolve(moduleId);
    return true;
  } catch {
    return false;
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

  // Try loading a preset from node_modules
  if (isResolvable(fn)) {
    return require(fn)(options).plugins;
  }

  const sugar = `cssnano-preset-${fn}`;

  // Try loading a preset from node_modules (sugar)
  if (isResolvable(sugar)) {
    return require(sugar)(options).plugins;
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
  if (path.basename(filePath) === 'package.json') {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')).cssnano;
  }
  if (filePath.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return createRequire(filePath)(filePath);
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupportedConfigFile(filePath) {
  return configFileNames.includes(path.basename(filePath));
}

/**
 * @param {string} [configFile]
 * @returns {unknown | null}
 */
function loadDiscoveredConfig(configFile) {
  if (configFile) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (!isSupportedConfigFile(configPath)) {
      throw new Error(
        `Unsupported cssnano configuration file "${configFile}". Use package.json, .cssnanorc.json, .cssnanorc.js, or cssnano.config.js.`
      );
    }
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
    const config = loadConfigFile(configPath);
    if (
      fileName !== 'package.json' ||
      (config !== undefined && config !== null)
    ) {
      return config;
    }
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
        if (typeof pluginDef === 'string' && isResolvable(pluginDef)) {
          nanoPlugins.push([
            /** @type {PluginCreator} */ (require(pluginDef)),
            opts,
          ]);
        } else {
          nanoPlugins.push([/** @type {PluginCreator} */ (pluginDef), opts]);
        }
      } else if (typeof plugin === 'string' && isResolvable(plugin)) {
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
