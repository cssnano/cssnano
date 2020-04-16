/* eslint-disable no-unused-vars */
// import postcss from ;
const moduleMap = {
  cssDeclarationSorter: require('css-declaration-sorter').default,
  postcssCalc: require('postcss-calc').default,
  postcssColormin: require('postcss-colormin').default,
  postcssConvertValues: require('postcss-convert-values').default,
  postcssDiscardComments: require('postcss-discard-comments').default,
  postcssDiscardDuplicates: require('postcss-discard-duplicates').default,
  postcssDiscardEmpty: require('postcss-discard-empty').default,
  postcssDiscardOverridden: require('postcss-discard-overridden').default,
  postcssMergeLonghand: require('postcss-merge-longhand').default,
  postcssMergeRules: require('postcss-merge-rules').default,
  postcssMinifyFontValues: require('postcss-minify-font-values').default,
  postcssMinifyGradients: require('postcss-minify-gradients').default,
  postcssMinifyParams: require('postcss-minify-params').default,
  postcssMinifySelectors: require('postcss-minify-selectors').default,
  postcssNormalizeCharset: require('postcss-normalize-charset').default,
  postcssNormalizeDisplayValues: require('postcss-normalize-display-values')
    .default,
  postcssNormalizePositions: require('postcss-normalize-positions').default,
  postcssNormalizeRepeatStyle: require('postcss-normalize-repeat-style')
    .default,
  postcssNormalizeString: require('postcss-normalize-string').default,
  postcssNormalizeTimingFunctions: require('postcss-normalize-timing-functions')
    .default,
  postcssNormalizeUnicode: require('postcss-normalize-unicode').default,
  postcssNormalizeUrl: require('postcss-normalize-url').default,
  postcssNormalizeWhitespace: require('postcss-normalize-whitespace').default,
  postcssOrderedValues: require('postcss-ordered-values').default,
  postcssReduceInitial: require('postcss-reduce-initial').default,
  postcssReduceTransforms: require('postcss-reduce-transforms').default,
  postcssSvgo: require('postcss-svgo').default,
  postcssUniqueSelectors: require('postcss-unique-selectors').default,
};

export default (css, plugins = []) => {
  import('postcss').then(async (postcss) => {
    let resolvePlugins = [];
    plugins.forEach((p) => resolvePlugins.push(moduleMap[pkgnameToVarName(p)]));
    // import('cssnano-preset-default').then((res) => console.log(res));
    // await postcss
    //   .default([resolvePlugins])
    //   .process(css)
    //   .then((res) => console.log('css', res));
    // console.log('resolvePlugins', ...resolvePlugins);
  });

  let output;
  // FIIXME : return `output` in future
  return '/* This is still under construction. Come back later*/';
};

const pkgnameToVarName = (str) =>
  str
    .split('-')
    .map((u, i) =>
      i === 0
        ? u
        : u
            .slice(0, 1)
            .toUpperCase()
            .concat(u.slice(1))
    )
    .join('');
