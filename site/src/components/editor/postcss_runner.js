// // import postcss from ;
// import cssDeclarationSorter from 'css-declaration-sorter';
// import postcssCalc from 'postcss-calc';
// import postcssColormin from 'postcss-colormin';
// import postcssConvertValues from 'postcss-convert-values';
// import postcssDiscardComments from 'postcss-discard-comments';
// import postcssDiscardDuplicates from 'postcss-discard-duplicates';
// import postcssDiscardEmpty from 'postcss-discard-empty';
// import postcssDiscardOverridden from 'postcss-discard-overridden';
// import postcssMergeLonghand from 'postcss-merge-longhand';
// import postcssMergeRules from 'postcss-merge-rules';
// import postcssMinifyFontValues from 'postcss-minify-font-values';
// import postcssMinifyGradients from 'postcss-minify-gradients';
// import postcssMinifyParams from 'postcss-minify-params';
// import postcssMinifySelectors from 'postcss-minify-selectors';
// import postcssNormalizeCharset from 'postcss-normalize-charset';
// import postcssNormalizeDisplayValues from 'postcss-normalize-display-values';
// import postcssNormalizePositions from 'postcss-normalize-positions';
// import postcssNormalizeRepeatStyle from 'postcss-normalize-repeat-style';
// import postcssNormalizeString from 'postcss-normalize-string';
// import postcssNormalizeTimingFunctions from 'postcss-normalize-timing-functions';
// import postcssNormalizeUnicode from 'postcss-normalize-unicode';
// import postcssNormalizeUrl from 'postcss-normalize-url';
// import postcssNormalizeWhitespace from 'postcss-normalize-whitespace';
// import postcssOrderedValues from 'postcss-ordered-values';
// import postcssReduceInitial from 'postcss-reduce-initial';
// import postcssReduceTransforms from 'postcss-reduce-transforms';
// import postcssSvgo from 'postcss-svgo';
// import postcssUniqueSelectors from 'postcss-unique-selectors';

export default (css, plugins = []) => {
  import('postcss').then((postcss) => {
    // let resolvePlugins = [];
    // plugins.forEach((p) => resolvePlugins.push(pkgnameToVarName(p)));
    // console.log('resolvePlugins', resolvePlugins);
  });

  let output;
  // FIXME : retur `output` in future
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
