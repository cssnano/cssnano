/**
 * @author Ben Briggs
 * @license MIT
 * @module cssnano:preset:default
 * @overview
 *
 * This default preset for cssnano only includes transforms that make no
 * assumptions about your CSS other than what is passed in. In previous
 * iterations of cssnano, assumptions were made about your CSS which caused
 * output to look different in certain use cases, but not others. These
 * transforms have been moved from the defaults to other presets, to make
 * this preset require only minimal configuration.
 */

import cssDeclarationSorter from 'css-declaration-sorter';
import postcssDiscardComments from 'lerna:postcss-discard-comments';
import postcssReduceInitial from 'lerna:postcss-reduce-initial';
import postcssMinifyGradients from 'lerna:postcss-minify-gradients';
import postcssSvgo from 'lerna:postcss-svgo';
import postcssReduceTransforms from 'lerna:postcss-reduce-transforms';
import postcssConvertValues from 'lerna:postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from 'lerna:postcss-colormin';
import postcssOrderedValues from 'lerna:postcss-ordered-values';
import postcssMinifySelectors from 'lerna:postcss-minify-selectors';
import postcssMinifyParams from 'lerna:postcss-minify-params';
import postcssNormalizeCharset from 'lerna:postcss-normalize-charset';
import postcssMinifyFontValues from 'lerna:postcss-minify-font-values';
import postcssNormalizeUrl from 'lerna:postcss-normalize-url';
import postcssMergeLonghand from 'lerna:postcss-merge-longhand';
import postcssDiscardDuplicates from 'lerna:postcss-discard-duplicates';
import postcssDiscardOverridden from 'lerna:postcss-discard-overridden';
import postcssNormalizeRepeatStyle from 'lerna:postcss-normalize-repeat-style';
import postcssMergeRules from 'lerna:postcss-merge-rules';
import postcssDiscardEmpty from 'lerna:postcss-discard-empty';
import postcssUniqueSelectors from 'lerna:postcss-unique-selectors';
import postcssNormalizeString from 'lerna:postcss-normalize-string';
import postcssNormalizePositions from 'lerna:postcss-normalize-positions';
import postcssNormalizeWhitespace from 'lerna:postcss-normalize-whitespace';
import postcssNormalizeUnicode from 'lerna:postcss-normalize-unicode';
import postcssUnusedVariables from 'lerna:postcss-unused-var';
import postcssNormalizeDisplayValues from 'lerna:postcss-normalize-display-values';
import postcssNormalizeTimingFunctions from 'lerna:postcss-normalize-timing-functions';
import rawCache from 'lerna:cssnano-util-raw-cache';

const defaultOpts = {
  convertValues: {
    length: false,
  },
  normalizeCharset: {
    add: false,
  },
  cssDeclarationSorter: {
    exclude: true,
  },
};

export default function defaultPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  const plugins = [
    [postcssDiscardComments, options.discardComments],
    [postcssMinifyGradients, options.minifyGradients],
    [postcssReduceInitial, options.reduceInitial],
    [postcssSvgo, options.svgo],
    [postcssNormalizeDisplayValues, options.normalizeDisplayValues],
    [postcssReduceTransforms, options.reduceTransforms],
    [postcssColormin, options.colormin],
    [postcssNormalizeTimingFunctions, options.normalizeTimingFunctions],
    [postcssCalc, options.calc],
    [postcssConvertValues, options.convertValues],
    [postcssOrderedValues, options.orderedValues],
    [postcssMinifySelectors, options.minifySelectors],
    [postcssMinifyParams, options.minifyParams],
    [postcssNormalizeCharset, options.normalizeCharset],
    [postcssDiscardOverridden, options.discardOverridden],
    [postcssNormalizeString, options.normalizeString],
    [postcssNormalizeUnicode, options.normalizeUnicode],
    [postcssMinifyFontValues, options.minifyFontValues],
    [postcssNormalizeUrl, options.normalizeUrl],
    [postcssNormalizeRepeatStyle, options.normalizeRepeatStyle],
    [postcssNormalizePositions, options.normalizePositions],
    [postcssNormalizeWhitespace, options.normalizeWhitespace],
    [postcssMergeLonghand, options.mergeLonghand],
    [postcssDiscardDuplicates, options.discardDuplicates],
    [postcssMergeRules, options.mergeRules],
    [postcssDiscardEmpty, options.discardEmpty],
    [postcssUniqueSelectors, options.uniqueSelectors],
    [cssDeclarationSorter, options.cssDeclarationSorter],
    [postcssUnusedVariables, options.removeUnusedVariables],
    [rawCache, options.rawCache],
  ];

  return { plugins };
}
