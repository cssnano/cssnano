'use strict';

const getBrowsersList = require('#getBrowsersList');
const { isSupported } = require('caniuse-api');
const fromInitial = require('./data/fromInitial.json');
const toInitial = require('./data/toInitial.json');
const ignoreProps = require('./lib/ignoreProps.js');

const initial = 'initial';

// In most of the browser including chrome the initial for `writing-mode` is not `horizontal-tb`. Ref https://github.com/cssnano/cssnano/pull/905
const defaultIgnoreProps = ignoreProps;

/**
 * @import browserslist from 'browserslist'
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{ignore?: string[]} & AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-reduce-initial',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(options, stats, from, file, env);

      const initialSupport = isSupported('css-initial-value', browsers);
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls((decl) => {
            const lowerCasedProp = decl.prop.toLowerCase();
            const ignoreProp = new Set(
              defaultIgnoreProps.concat(
                /** @type {Options} */ (options).ignore || []
              )
            );

            if (ignoreProp.has(lowerCasedProp)) {
              return;
            }

            if (
              initialSupport &&
              Object.hasOwn(toInitial, lowerCasedProp) &&
              decl.value.toLowerCase() ===
                toInitial[/** @type keyof typeof toInitial */ (lowerCasedProp)]
            ) {
              decl.value = initial;
              return;
            }

            if (
              decl.value.toLowerCase() !== initial ||
              !fromInitial[
                /** @type keyof typeof fromInitial */ (lowerCasedProp)
              ]
            ) {
              return;
            }

            decl.value =
              fromInitial[
                /** @type keyof typeof fromInitial */ (lowerCasedProp)
              ];
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<Options>} */ (
  pluginCreator
);
