import { resolveTargets } from '#utils/browser-targets';
import runMerge from './lib/selectorMerger.js';

/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors - Array of selector strings for the rule
 * @property {import('postcss').Declaration[]} declarations - Array of declaration nodes for the rule
 */

/**
 * @typedef {object} Options
 */

/** @param {Options} opts @return {import('postcss').Plugin} */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-merge-rules',

    /** @param {import('postcss').Result} result */
    prepare(result) {
      const browsers = resolveTargets(opts, result);
      const compatibilityCache = new Map();
      // Use WeakSet and WeakMap to avoid memory leaks because the keys are objects.
      const ruleCache = new WeakSet();
      const ruleMeta = new WeakMap();
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          runMerge(css, browsers, compatibilityCache, ruleCache, ruleMeta);
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
