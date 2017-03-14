import postcssDiscardComments from 'postcss-discard-comments';
import postcssReduceInitial from 'postcss-reduce-initial';
import postcssMinifyGradients from 'postcss-minify-gradients';
import postcssSvgo from 'postcss-svgo';
import postcssReduceTransforms from 'postcss-reduce-transforms';
import postcssConvertValues from 'postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from 'postcss-colormin';
import postcssOrderedValues from 'postcss-ordered-values';
import postcssMinifySelectors from 'postcss-minify-selectors';
import postcssMinifyParams from 'postcss-minify-params';
import postcssNormalizeCharset from 'postcss-normalize-charset';
import postcssMinifyFontValues from 'postcss-minify-font-values';
import postcssNormalizeUrl from 'postcss-normalize-url';
import postcssMergeLonghand from 'postcss-merge-longhand';
import postcssDiscardDuplicates from 'postcss-discard-duplicates';
import postcssDiscardOverridden from 'postcss-discard-overridden';
import postcssNormalizeRepeatStyle from 'postcss-normalize-repeat-style';
import postcssMergeRules from 'postcss-merge-rules';
import postcssDiscardEmpty from 'postcss-discard-empty';
import postcssUniqueSelectors from 'postcss-unique-selectors';
import postcssNormalizeString from 'postcss-normalize-string';
import postcssNormalizePositions from 'postcss-normalize-positions';
import postcssNormalizeWhitespace from 'postcss-normalize-whitespace';
import postcssNormalizeUnicode from 'postcss-normalize-unicode';
import postcssNormalizeDisplayValues from 'postcss-normalize-display-values';
import postcssNormalizeTimingFunctions from 'postcss-normalize-timing-functions';
import styleCache from './lib/styleCache';

const defaultOpts = {
    convertValues: {
        length: false,
    },
    normalizeCharset: {
        add: false,
    },
};

export default function defaultPreset (opts = {}) {
    const options = Object.assign({}, defaultOpts, opts);

    const plugins = [
        [postcssDiscardComments, options.discardComments],
        [postcssMinifyGradients, options.minifyGradients],
        [postcssReduceInitial, options.reduceInitial],
        [postcssSvgo, options.svgo],
        [postcssNormalizeDisplayValues, options.normalizeDisplayValues],
        [postcssReduceTransforms, options.reduceTransforms],
        [postcssColormin, options.colormin],
        [postcssConvertValues, options.convertValues],
        [postcssNormalizeTimingFunctions, options.normalizeTimingFunctions],
        [postcssCalc, options.calc],
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
        [styleCache, options.styleCache],
    ];

    return {plugins};
}
