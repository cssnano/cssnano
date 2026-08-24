import LayerCache from './lib/layerCache.js';

const zIndexRegex = /z-index/i;
/** @typedef {{startIndex?: number}} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-zindex',
    prepare() {
      const cache = new LayerCache();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          /** @type {import('postcss').Declaration[]} */
          const nodes = [];
          let abort = false;

          // First pass; cache all z indexes
          css.walkDecls(zIndexRegex, (decl) => {
            // Check that no negative values exist. Rebasing is only
            // safe if all indices are positive numbers.
            if (decl.value[0] === '-') {
              abort = true;
              // Stop PostCSS iterating through the rest of the decls
              return false;
            }
            nodes.push(decl);
            cache.addValue(decl.value);
          });

          // Abort if we found any negative values
          // or there are no z-index declarations
          if (abort || !nodes.length) {
            return;
          }

          cache.optimizeValues(/** @type {Options} */ (opts).startIndex || 1);

          // Second pass; optimize
          for (const decl of nodes) {
            // Need to coerce to string so that the
            // AST is updated correctly
            decl.value = cache.getValue(decl.value).toString();
          }
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
