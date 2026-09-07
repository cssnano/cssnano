import getBrowsersList from '#getBrowsersList';
import selectorMerger from './lib/selector-merger.js';

/** @import browserslist from 'browserslist' */

/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors - Array of selector strings for the rule
 * @property {import('postcss').Declaration[]} declarations - Array of declaration nodes for the rule
 * @property {boolean} dirty - Whether the selectors have been modified and need flushing
 */

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/** @param {Options} opts @return {import('postcss').Plugin} */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-merge-rules',

    /** @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(opts, stats, from, file, env);
      const compatibilityCache = new Map();
      // Use WeakSet and WeakMap to avoid memory leaks because the keys are objects.
      const ruleCache = new WeakSet();
      const ruleMeta = new WeakMap();
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          selectorMerger(browsers, compatibilityCache, ruleCache, ruleMeta).run(
            css
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
