import getBrowsersList from '#getBrowsersList';
import plugins from './plugins/index.js';

/** @import {Declaration} from 'postcss'; */

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
          /** @type {import('./plugin.js').Plugin[]} */
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

/** @type {WeakMap<Declaration, {before: string | undefined, prop: string, value: string, detected: boolean}>} */
const declarationDetections = new WeakMap();

/** @param {import('postcss').Node} node */
function detect(node) {
  if (node.type === 'decl') {
    const declaration = /** @type {Declaration} */ (node);
    const { before } = declaration.raws;
    const cached = declarationDetections.get(declaration);

    if (
      cached &&
      cached.before === before &&
      cached.prop === declaration.prop &&
      cached.value === declaration.value
    ) {
      return cached.detected;
    }

    const detected = plugins.some((Plugin) => {
      const hack = new Plugin();

      return hack.any(node);
    });
    declarationDetections.set(declaration, {
      before,
      prop: declaration.prop,
      value: declaration.value,
      detected,
    });

    return detected;
  }

  return plugins.some((Plugin) => {
    const hack = new Plugin();

    return hack.any(node);
  });
}

pluginCreator.detect = detect;

pluginCreator.postcss = true;
const moduleExports =
  /** @type {import('postcss').PluginCreator<Options> & {detect: (node: import('postcss').Node) => boolean}} */ (
    pluginCreator
  );

export { moduleExports as default, moduleExports as 'module.exports' };
