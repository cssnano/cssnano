import { resolveTargets } from '#utils/browser-targets';
import { supportsAll } from '#utils/browser-support';
import fromInitial from './data/fromInitial.json' with { type: 'json' };
import toInitial from './data/toInitial.json' with { type: 'json' };
import ignoreProps from './lib/ignoreProps.js';

const initial = 'initial';

// In most of the browser including chrome the initial for `writing-mode` is not `horizontal-tb`. Ref https://github.com/cssnano/cssnano/pull/905
const defaultIgnoreProps = ignoreProps;

/**
 * @import {TargetOptions} from '#utils'
 * @typedef {{ignore?: string[]} & TargetOptions} Options
 */

/**
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-reduce-initial',

    /**
     * @param {import('postcss').Result} result
     */
    prepare(result) {
      const browsers = resolveTargets(options, result);

      // A target without the initial keyword drops the declaration, so
      // rewriting it to an explicit value would make it apply.
      if (!supportsAll(browsers, 'css-initial-value')) {
        return {};
      }
      const ignoreProp = new Set(
        defaultIgnoreProps.concat(/** @type {Options} */ (options).ignore || [])
      );
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls((decl) => {
            const lowerCasedProp = decl.prop.toLowerCase();
            if (ignoreProp.has(lowerCasedProp)) {
              return;
            }

            if (
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
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
