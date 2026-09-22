import getBrowsersList from '#getBrowsersList';
import transform from './lib/transform.js';

/** @import browserslist from 'browserslist' */
/** @import convert from './lib/convert.js' */

const plugin = 'postcss-convert-values';

/**
 * @typedef {Parameters<typeof convert>[2]} ConvertOptions
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{precision?: false | number, transformCustomProperties?: boolean} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */

/** @param {Options} opts @return {import('postcss').Plugin} */
function pluginCreator(opts = { precision: false }) {
  return {
    postcssPlugin: plugin,

    /** @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(opts, stats, from, file, env);
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          css.walkDecls((decl) =>
            transform(/** @type {Options} */ (opts), browsers, decl)
          );
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
