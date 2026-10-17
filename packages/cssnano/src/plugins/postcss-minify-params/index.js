import { resolveTargets } from '#utils/browser-targets';
import { anyAffected } from '#utils/browser-bugs';
import transform from './lib/transform.js';

/** @import {TargetOptions} from '#utils' */

/**
 * @typedef {TargetOptions} Options
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
     * @param {import('postcss').Result} result
     */
    prepare(result) {
      const browsers = resolveTargets(options, result);
      const hasAllBug = anyAffected(browsers, 'media-all-ie11');

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
