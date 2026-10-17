import presetTargets from './presetTargets.js';

/** @import {Result} from 'postcss' */

/**
 * A preset gives every plugin the same targets, so a target option that a
 * user also set on one plugin has no effect. Say so, because the output is
 * written for other browsers than the user may expect. The preset names the
 * plugin by its option key, because PostCSS has not recorded the running
 * plugin yet when plugins prepare.
 * @param {Result | undefined} result
 * @param {string} plugin the key of the plugin in the preset options
 * @param {readonly string[]} ignored the target options the user set on it
 */
export function warnIgnoredTargetOptions(result, plugin, ignored) {
  if (result === undefined) return;
  for (const key of ignored) {
    result.warn(
      `The ${plugin} option ${key} is ignored, because the preset sets the browser targets for every plugin. Set ${key} in the preset options instead.`,
      { plugin: 'cssnano' }
    );
  }
}

/**
 * For a plugin that does not read the targets in some configuration, such as
 * minifySelectors with convertToIs disabled, but whose user may still have
 * set target options.
 * @param {object} options the plugin options a preset produced
 * @param {Result | undefined} result
 */
export function reportIgnoredTargetOptions(options, result) {
  const fromPreset =
    /** @type {{[presetTargets]?: {plugin: string, ignored: readonly string[]}}} */ (
      options
    )[presetTargets];
  if (fromPreset === undefined) return;
  warnIgnoredTargetOptions(result, fromPreset.plugin, fromPreset.ignored);
}

/**
 * Reports the ignored target options of plugins that never read browser
 * targets, because only a plugin that does could report them itself.
 * @param {{reports: readonly {plugin: string, ignored: readonly string[]}[]}} options
 * @return {import('postcss').Plugin}
 */
export function ignoredTargetOptionsPlugin({ reports }) {
  return {
    postcssPlugin: 'cssnano-ignored-target-options',
    /** @param {Result} result */
    prepare(result) {
      for (const report of reports) {
        warnIgnoredTargetOptions(result, report.plugin, report.ignored);
      }
      return {};
    },
  };
}
ignoredTargetOptionsPlugin.postcss = true;
