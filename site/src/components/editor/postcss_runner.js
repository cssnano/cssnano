/* eslint-disable no-warning-comments */
/* eslint-disable no-unused-vars */
const postcss = require('postcss');
// TODO
// const moduleMap = {
//   cssDeclarationSorter: require('css-declaration-sorter').default,
//   postcssCalc: require('postcss-calc').default,
//   postcssColormin: require('postcss-colormin').default,
//   postcssConvertValues: require('postcss-convert-values').default,
//   postcssDiscardComments: require('postcss-discard-comments').default,
//   postcssDiscardDuplicates: require('postcss-discard-duplicates').default,
//   postcssDiscardEmpty: require('postcss-discard-empty').default,
//   postcssDiscardOverridden: require('postcss-discard-overridden').default,
//   postcssMergeLonghand: require('postcss-merge-longhand').default,
//   postcssMergeRules: require('postcss-merge-rules').default,
//   postcssMinifyFontValues: require('postcss-minify-font-values').default,
//   postcssMinifyGradients: require('postcss-minify-gradients').default,
//   postcssMinifyParams: require('postcss-minify-params').default,
//   postcssMinifySelectors: require('postcss-minify-selectors').default,
//   postcssNormalizeCharset: require('postcss-normalize-charset').default,
//   postcssNormalizeDisplayValues: require('postcss-normalize-display-values')
//     .default,
//   postcssNormalizePositions: require('postcss-normalize-positions').default,
//   postcssNormalizeRepeatStyle: require('postcss-normalize-repeat-style')
//     .default,
//   postcssNormalizeString: require('postcss-normalize-string').default,
//   postcssNormalizeTimingFunctions: require('postcss-normalize-timing-functions')
//     .default,
//   postcssNormalizeUnicode: require('postcss-normalize-unicode').default,
//   postcssNormalizeUrl: require('postcss-normalize-url').default,
//   postcssNormalizeWhitespace: require('postcss-normalize-whitespace').default,
//   postcssOrderedValues: require('postcss-ordered-values').default,
//   postcssReduceInitial: require('postcss-reduce-initial').default,
//   postcssReduceTransforms: require('postcss-reduce-transforms').default,
//   postcssSvgo: require('postcss-svgo').default,
//   postcssUniqueSelectors: require('postcss-unique-selectors').default,
// };

/**
 * using moduleMaps and not with imports to lazy load them because of this error
 * editor lazy namespace object?f49d:5 Uncaught (in promise) Error: Cannot find module 'cssnano-preset-default'
    at eval (eval at ./src/components/editor lazy recursive
 * need to fix this
 */
const moduleMap = {
  cssnanoPresetDefault: require('cssnano-preset-default'),
  cssnanoPresetAdvanced: require('cssnano-preset-advanced'),
};

function initializePlugin(plugin, css, result) {
  if (Array.isArray(plugin)) {
    const [processor, opts] = plugin;
    if (
      typeof opts === 'undefined' ||
      (typeof opts === 'object' && !opts.exclude)
    ) {
      return Promise.resolve(processor(opts)(css, result));
    }
  } else {
    return Promise.resolve(plugin()(css, result));
  }
  // Handle excluded plugins
  return Promise.resolve();
}

export default (input, config) => {
  const { plugins } = moduleMap[pkgnameToVarName(config[0])](config[1]);
  const pluginRunner = (css, result) =>
    plugins.reduce((promise, plugin) => {
      return promise.then(initializePlugin.bind(null, plugin, css, result));
    }, Promise.resolve());
  return new Promise((resolve, reject) => {
    postcss(pluginRunner)
      .process(input)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });
};

const pkgnameToVarName = (str) =>
  str
    .split('-')
    .map((u, i) =>
      i === 0 ? u : u.slice(0, 1).toUpperCase().concat(u.slice(1))
    )
    .join('');
