import { createRequire } from 'node:module';
import postcss from 'postcss';
import defaultPreset from 'cssnano-preset-default';

const require = createRequire(import.meta.url);

let warnedAboutConfigFile = false;

/** @typedef {boolean | { exclude?: boolean } | void | undefined} PluginOptions */
/** @typedef {import('postcss').PluginCreator<any>} PluginCreator */
/** @typedef {[PluginCreator, PluginOptions]} PresetPlugin */
/** @typedef {(options?: any) => { plugins: PresetPlugin[] }} PresetFactory */
/** @typedef {string | PresetFactory | [string | PresetFactory, object] | { plugins: PresetPlugin[] }} PresetSpec */
/** @typedef {string | PluginCreator | [string | PluginCreator, object?]} PluginSpec */
/** @typedef {{ preset?: PresetSpec, plugins?: PluginSpec[] }} Options */
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
 * @param {PluginSpec} plugin
 * @return {PresetPlugin}
 */
function resolvePlugin(plugin) {
  if (Array.isArray(plugin)) {
    const [pluginDef, opts = {}] = plugin;
    if (typeof pluginDef === 'string' && isResolvable(pluginDef)) {
      return [require(pluginDef), opts];
    }
    return [/** @type {PluginCreator} */ (pluginDef), opts];
  }
  if (typeof plugin === 'string' && isResolvable(plugin)) {
    return [require(plugin), {}];
  }
  return [/** @type {PluginCreator} */ (plugin), {}];
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

  if (!fn) {
    return [];
  }

  // For JS setups where we invoked the preset already
  if (typeof fn === 'object' && fn !== null && fn.plugins) {
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
  if (typeof fn === 'string' && isResolvable(fn)) {
    return require(fn)(options).plugins;
  }

  const sugar = `cssnano-preset-${fn}`;

  // Try loading a preset from node_modules (sugar)
  if (typeof fn === 'string' && isResolvable(sugar)) {
    return require(sugar)(options).plugins;
  }

  // If all else fails, we probably have a typo in the config somewhere
  throw new Error(
    `Cannot load preset "${fn}". Please check your configuration for errors and try again.`
  );
}

/**
 * @param {Options} options
 * @return {PresetPlugin[]}
 */
function resolveConfig(options) {
  if (options.preset) {
    return resolvePreset(options.preset);
  }
  return resolvePreset('default');
}

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
function cssnanoPlugin(options = {}) {
  // configFile was removed; warn JS callers instead of silently ignoring it.
  // The type omits it deliberately, so access through a widened view.
  const { configFile } = /** @type {Options & { configFile?: string }} */ (
    options
  );
  if (configFile !== undefined && !warnedAboutConfigFile) {
    warnedAboutConfigFile = true;
    console.warn(
      'cssnano: the `configFile` option is no longer supported. Move your configuration into `postcss.config.mjs` or pass it directly to `cssnano(options)`.'
    );
  }

  /** @type {PresetPlugin[]} */
  let nanoPlugins;
  if (options.plugins && !options.preset) {
    nanoPlugins = [];
  } else {
    nanoPlugins = resolveConfig(options);
  }

  if (Array.isArray(options.plugins)) {
    const extraPlugins = options.plugins.map(resolvePlugin);
    nanoPlugins = [...nanoPlugins, ...extraPlugins];
  }

  const plugins = [];
  for (const nanoPlugin of nanoPlugins) {
    if (Array.isArray(nanoPlugin)) {
      const [processor, opts] = nanoPlugin;
      if (
        typeof opts === 'undefined' ||
        (typeof opts === 'object' && opts !== null && !opts.exclude) ||
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

cssnanoPlugin.postcss = true;

export { cssnanoPlugin as default, cssnanoPlugin as 'module.exports' };
