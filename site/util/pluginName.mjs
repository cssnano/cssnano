import postcss from 'postcss';

/**
 * @param {import('postcss').PluginCreator<unknown>} plugin
 * @returns {string}
 */
export default function pluginName(plugin) {
  const instance = /** @type {import('postcss').Plugin} */ (
    postcss(plugin).plugins[0]
  );
  return /** @type {string} */ (instance.postcssPlugin);
}
