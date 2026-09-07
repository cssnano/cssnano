import getBrowsersList from '#getBrowsersList';
import transform from './lib/transform.js';

/** @import browserslist from 'browserslist' */

const allBugBrowsers = new Set(['ie 10', 'ie 11']);

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-minify-params',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(options, stats, from, file, env);
      const hasAllBug = !new Set(browsers).isDisjointFrom(allBugBrowsers);

      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          css.walkAtRules((rule) => transform(hasAllBug, rule));
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
