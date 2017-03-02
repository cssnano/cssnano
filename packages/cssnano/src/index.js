import decamelize from 'decamelize';
import defined from 'defined';
import postcss from 'postcss';

// Processors
import postcssDiscardComments from 'postcss-discard-comments';
import postcssReduceInitial from 'postcss-reduce-initial';
import postcssMinifyGradients from 'postcss-minify-gradients';
import postcssSvgo from 'postcss-svgo';
import postcssReduceTransforms from 'postcss-reduce-transforms';
import autoprefixer from 'autoprefixer';
import postcssZindex from 'postcss-zindex';
import postcssConvertValues from 'postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from 'postcss-colormin';
import postcssOrderedValues from 'postcss-ordered-values';
import postcssMinifySelectors from 'postcss-minify-selectors';
import postcssMinifyParams from 'postcss-minify-params';
import postcssNormalizeCharset from 'postcss-normalize-charset';
import postcssMinifyFontValues from 'postcss-minify-font-values';
import postcssDiscardUnused from 'postcss-discard-unused';
import postcssNormalizeUrl from 'postcss-normalize-url';
import postcssMergeIdents from 'postcss-merge-idents';
import postcssReduceIdents from 'postcss-reduce-idents';
import postcssMergeLonghand from 'postcss-merge-longhand';
import postcssDiscardDuplicates from 'postcss-discard-duplicates';
import postcssDiscardOverridden from 'postcss-discard-overridden';
import postcssMergeRules from 'postcss-merge-rules';
import postcssDiscardEmpty from 'postcss-discard-empty';
import postcssUniqueSelectors from 'postcss-unique-selectors';
import functionOptimiser from './lib/functionOptimiser';
import normalizeString from './lib/normalizeString';
import normalizeUnicode from './lib/normalizeUnicode';
import reduceDisplayValues from './lib/reduceDisplayValues';
import reduceBackgroundRepeat from './lib/reduceBackgroundRepeat';
import reducePositions from './lib/reducePositions';
import core from './lib/core';
import reduceTimingFunctions from './lib/reduceTimingFunctions';
import styleCache from './lib/styleCache';

const processors = {
    postcssDiscardComments,
    postcssMinifyGradients,
    postcssReduceInitial,
    postcssSvgo,
    reduceDisplayValues,
    postcssReduceTransforms,
    autoprefixer,
    postcssZindex,
    postcssConvertValues,
    reduceTimingFunctions,
    postcssCalc,
    postcssColormin,
    postcssOrderedValues,
    postcssMinifySelectors,
    postcssMinifyParams,
    postcssNormalizeCharset,
    postcssDiscardOverridden,
    normalizeString,
    normalizeUnicode,
    // minify-font-values should be run before discard-unused
    postcssMinifyFontValues,
    postcssDiscardUnused,
    postcssNormalizeUrl,
    functionOptimiser,
    reduceBackgroundRepeat,
    reducePositions,
    core,
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    postcssMergeIdents,
    postcssReduceIdents,
    postcssMergeLonghand,
    postcssDiscardDuplicates,
    postcssMergeRules,
    postcssDiscardEmpty,
    postcssUniqueSelectors,
    styleCache,
};

let defaultOptions = {
    autoprefixer: {
        add: false,
    },
    postcssConvertValues: {
        length: false,
    },
    postcssNormalizeCharset: {
        add: false,
    },
};

let safeOptions = {
    postcssConvertValues: {
        length: false,
    },
    postcssDiscardUnused: {
        disable: true,
    },
    postcssMergeIdents: {
        disable: true,
    },
    postcssReduceIdents: {
        counterStyle: false,
        gridTemplate: false,
        keyframes: false,
    },
    postcssNormalizeUrl: {
        stripWWW: false,
    },
    postcssZindex: {
        disable: true,
    },
};

export default postcss.plugin('cssnano', (options = {}) => {
    // Prevent PostCSS from throwing when safe is defined
    if (options.safe === true) {
        options.isSafe = true;
        options.safe = null;
    }

    const safe = options.isSafe;
    const proc = postcss();

    Object.keys(processors).forEach(plugin => {
        let shortName = plugin.replace('postcss', '');
        shortName = shortName.slice(0, 1).toLowerCase() + shortName.slice(1);

        let opts = defined(
            options[shortName],
            options[plugin],
            options[decamelize(plugin, '-')]
        );

        if (opts === false) {
            opts = {disable: true};
        }

        opts = Object.assign({},
            defaultOptions[plugin],
            safe ? safeOptions[plugin] : null,
            opts
        );

        if (!opts.disable) {
            proc.use(processors[plugin](opts));
        }

    });

    return proc;
});
