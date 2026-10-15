import { resolveTargets } from '#utils/browser-targets';
import { anyAffected } from '#utils/browser-bugs';
import transform from './lib/transform.js';

/** @import {TargetOptions} from '#utils' */

const plugin = 'postcss-convert-values';

/**
 * @typedef {import('./lib/findReplacements.js').Options & TargetOptions} Options
 */

/** @param {Options} opts @return {import('postcss').Plugin} */
function pluginCreator(opts = { precision: false }) {
  return {
    postcssPlugin: plugin,

    /** @param {import('postcss').Result} result */
    prepare(result) {
      const browsers = resolveTargets(opts, result);
      const supportsIE = anyAffected(browsers, 'ie-zero-unit-retention');
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
