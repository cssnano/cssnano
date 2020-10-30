import LayerCache from './lib/layerCache';

const pluginCreator = (opts = {}) => {
  return {
    postcssPlugin: 'postcss-zindex',
    prepare() {
      const cache = new LayerCache(opts);
      const nodes = [];
      let abort = false;
      return {
        Declaration: {
          // First pass; cache all z indexes
          'z-index': (decl) => {
            // Check that no negative values exist. Rebasing is only
            // safe if all indices are positive numbers.
            if (decl.value[0] === '-') {
              abort = true;
              // Stop PostCSS iterating through the rest of the decls
              return;
            }
            nodes.push(decl);
            cache.addValue(decl.value);
          },
        },
        OnceExit() {
          // Abort if we found any negative values
          // or there are no z-index declarations
          if (abort || !nodes.length) {
            return;
          }

          cache.optimizeValues();

          // Second pass; optimize
          nodes.forEach((decl) => {
            // Need to coerce to string so that the
            // AST is updated correctly
            decl.value = cache.getValue(decl.value).toString();
          });
        },
      };
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;
