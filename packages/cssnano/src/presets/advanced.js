import defaultPreset from '#presets/default';
import postcssDiscardUnused from '#postcss-discard-unused';
import postcssMergeIdents from '#postcss-merge-idents';
import postcssReduceIdents from '#postcss-reduce-idents';
import postcssZindex from '#postcss-zindex';

/**
 * @template {object | void} [OptionsExtends=void]
 * @typedef {false | OptionsExtends & {exclude?: true}} SimpleOptions
 */

/**
 * @typedef {object} AdvancedOptions
 * @property {SimpleOptions<import('#postcss-discard-unused').Options>} [discardUnused]
 * @property {SimpleOptions} [mergeIdents]
 * @property {SimpleOptions<import('#postcss-reduce-idents').Options>} [reduceIdents]
 * @property {SimpleOptions<import('#postcss-zindex').Options>} [zindex]
 */

/**
 * @typedef {import('#presets/default').AutoprefixerOptions} AutoprefixerOptions
 * @typedef {import('#presets/default').BrowserslistOptions} BrowserslistOptions
 * @typedef {import('#presets/default').Options & AdvancedOptions} Options
 */
/**
 * @param {[import('postcss').PluginCreator<any>, keyof AdvancedOptions][]} plugins
 * @param {Parameters<typeof advancedPreset>[0]} opts
 * @returns {ReturnType<typeof advancedPreset>["plugins"]}
 */
function configurePlugins(plugins, opts = {}) {
  return plugins.map(([plugin, opt]) => {
    const presetProps = opts[opt] ?? {};

    return [plugin, presetProps !== false ? presetProps : { exclude: true }];
  });
}

/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
function advancedPreset(opts = {}) {
  const { plugins: pluginsDefault } = defaultPreset(opts);

  return {
    plugins: [
      ...pluginsDefault,
      ...configurePlugins(
        [
          [postcssDiscardUnused, 'discardUnused'],
          [postcssMergeIdents, 'mergeIdents'],
          [postcssReduceIdents, 'reduceIdents'],
          [postcssZindex, 'zindex'],
        ],
        opts
      ),
    ],
  };
}
const moduleExports = advancedPreset;

export { moduleExports as default, moduleExports as 'module.exports' };
