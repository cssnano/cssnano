/**
 * @import {PluginCreator} from 'postcss'
 * @typedef {[PluginCreator<any>, unknown]} PresetPlugin
 */

/**
 * Keeps the plugins cssnano runs for a preset: options that are `undefined`,
 * `true`, or an object without `exclude`. `null` is skipped here, where cssnano
 * would throw.
 * @param {() => {plugins: PresetPlugin[]}} presetModule
 * @returns {PresetPlugin[]}
 */
export function enabledPlugins(presetModule) {
  return presetModule().plugins.filter(([, options]) => {
    if (options === undefined || options === true) return true;
    return (
      typeof options === 'object' &&
      options !== null &&
      !(/** @type {{exclude?: unknown}} */ (options).exclude)
    );
  });
}
