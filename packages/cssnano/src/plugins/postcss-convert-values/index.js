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
  /** @type {Map<string, boolean>} */
  const browserCache = new Map();

  return {
    postcssPlugin: plugin,

    /** @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const overrideKey = opts.overrideBrowserslist
        ? JSON.stringify(opts.overrideBrowserslist)
        : '';
      const pathKey = opts.path ?? '';
      const envKey = opts.env ?? env ?? '';
      const effectiveStats = opts.stats || stats;
      const statsKey = effectiveStats ? JSON.stringify(effectiveStats) : '';
      const cacheKey = `${overrideKey}\0${pathKey}\0${envKey}\0${from ?? ''}\0${file ?? ''}\0${statsKey}`;
      let supportsIE = browserCache.get(cacheKey);
      if (supportsIE === undefined) {
        const browsers = getBrowsersList(opts, stats, from, file, env);
        supportsIE = browsers.some((b) => b.startsWith('ie '));
        browserCache.set(cacheKey, supportsIE);
      }
      const cache = new Map();
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          css.walkDecls((decl) =>
            transform(/** @type {Options} */ (opts), supportsIE, decl, cache)
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
