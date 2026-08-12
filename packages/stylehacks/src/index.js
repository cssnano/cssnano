'use strict';
const getBrowsersList = require('#getBrowsersList');
const plugins = require('./plugins');

/**
 * @import browserslist from 'browserslist'
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{lint?: boolean} & AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'stylehacks',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(opts, stats, from, file, env);
      const browserSet = new Set(browsers);

      return /** import('postcss').Plugin */ {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          /** @type {import('./plugin').Plugin[]} */
          const processors = [];
          for (const Plugin of plugins) {
            const hack = new Plugin(result);
            if (browserSet.isDisjointFrom(hack.targets)) {
              processors.push(hack);
            }
          }
          css.walk((node) => {
            for (const proc of processors) {
              if (!proc.nodeTypes.has(node.type)) {
                continue;
              }

              if (opts.lint) {
                proc.detectAndWarn(node);
              } else {
                proc.detectAndResolve(node);
              }
            }
          });
        },
      };
    },
  };
}

/** @type {(node: import('postcss').Node) => boolean} */
pluginCreator.detect = (node) => {
  return plugins.some((Plugin) => {
    const hack = new Plugin();

    return hack.any(node);
  });
};

pluginCreator.postcss = true;
module.exports =
  /** @type {import('postcss').PluginCreator<Options> & {detect: (node: import('postcss').Node) => boolean}} */ (
    pluginCreator
  );
