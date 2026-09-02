import getBrowsersList from '#getBrowsersList';
import caniuseApi from 'caniuse-api';
import { normalizeList } from './lib/selectorScanner.js';

/** @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions */
/** @typedef {Pick<import('browserslist').Options, 'stats' | 'path' | 'env'>} BrowserslistOptions */
/** @typedef {{ sort?: boolean, convertToIs?: boolean } & AutoprefixerOptions & BrowserslistOptions} Options */

/**
 * Minify selectors from tokenizer spans. Parsing, normalization, and dedupe
 * are linear in selector tokens; only top-level sorting is O(k log k).
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  const resolved = { sort: true, convertToIs: true, ...opts };
  return {
    postcssPlugin: 'postcss-minify-selectors',
    /** @param {import('postcss').Result} result */
    prepare(result) {
      let fold = resolved.convertToIs !== false;
      if (fold) {
        const { stats, env, from, file } =
          /** @type {BrowserslistOptions & {from?: string, file?: string}} */ (
            result.opts || {}
          );
        fold = caniuseApi.isSupported(
          'css-matches-pseudo',
          getBrowsersList(resolved, stats, from, file, env)
        );
      }
      return {
        /** @param {import('postcss').Root} css */
        OnceExit(css) {
          const cache = new Map();
          css.walkRules((rule) => {
            const source =
              rule.raws.selector && rule.raws.selector.value === rule.selector
                ? rule.raws.selector.raw
                : rule.selector;
            if (source.at(-1) === ':') return;
            let output = cache.get(source);
            if (output === undefined) {
              output = normalizeList(source, resolved.sort, fold);
              cache.set(source, output);
            }
            rule.selector = output;
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
