'use strict';
const browserslist = require('browserslist');
const { isSupported } = require('caniuse-api');
const fromInitial = require('./data/fromInitial.json');
const toInitial = require('./data/toInitial.json');
const ignoreProps = require('./lib/ignoreProps.js');

const initial = 'initial';

// In most of the browser including chrome the initial for `writing-mode` is not `horizontal-tb`. Ref https://github.com/cssnano/cssnano/pull/905
const defaultIgnoreProps = ignoreProps;

/**
 * @typedef {Pick<browserslist.Options, 'stats' | 'env'>} BrowserslistOptions
 * @typedef {{ignore?: string[]} & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-reduce-initial',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions}} result
     */
    prepare(result) {
      const { stats, env } = result.opts || {};
      const browsers = browserslist(null, {
        stats: options.stats || stats,
        path: __dirname,
        env: options.env || env,
      });

      const initialSupport = isSupported('css-initial-value', browsers);
      return {
        OnceExit(css) {
          css.walkDecls((decl) => {
            const lowerCasedProp = decl.prop.toLowerCase();
            const ignoreProp = new Set(
              defaultIgnoreProps.concat(options.ignore || [])
            );

            if (ignoreProp.has(lowerCasedProp)) {
              return;
            }

            if (
              initialSupport &&
              Object.prototype.hasOwnProperty.call(toInitial, lowerCasedProp) &&
              decl.value.toLowerCase() ===
                toInitial[/** @type {keyof toInitial} */ (lowerCasedProp)]
            ) {
              decl.value = initial;
              return;
            }

            if (
              decl.value.toLowerCase() !== initial ||
              !fromInitial[/** @type {keyof fromInitial} */ (lowerCasedProp)]
            ) {
              return;
            }

            decl.value =
              fromInitial[/** @type {keyof fromInitial} */ (lowerCasedProp)];
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
