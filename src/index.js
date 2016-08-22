import decamelize from 'decamelize';
import defined from 'defined';
import assign from 'object-assign';
import postcss from 'postcss';

// Processors
import postcssFilterPlugins from 'postcss-filter-plugins';
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
import filterOptimiser from './lib/filterOptimiser';
import reduceBackgroundRepeat from './lib/reduceBackgroundRepeat';
import reducePositions from './lib/reducePositions';
import core from './lib/core';
import reduceTimingFunctions from './lib/reduceTimingFunctions';
import styleCache from './lib/styleCache';

/**
 * Deprecation warnings
 */

import warnOnce from './lib/warnOnce';

const processors = {
    postcssFilterPlugins: () => postcssFilterPlugins({silent: true}),
    postcssDiscardComments,
    postcssMinifyGradients,
    postcssReduceInitial,
    postcssSvgo,
    postcssReduceTransforms,
    autoprefixer,
    postcssZindex,
    postcssCalc,
    postcssConvertValues,
    reduceTimingFunctions,
    postcssColormin,
    postcssOrderedValues,
    postcssMinifySelectors,
    postcssMinifyParams,
    postcssNormalizeCharset,
    postcssDiscardOverridden,
    // minify-font-values should be run before discard-unused
    postcssMinifyFontValues,
    postcssDiscardUnused,
    postcssNormalizeUrl,
    functionOptimiser,
    filterOptimiser,
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
        keyframes: false,
    },
    postcssNormalizeUrl: {
        stripWWW: false,
    },
    postcssZindex: {
        disable: true,
    },
};

const cssnano = postcss.plugin('cssnano', (options = {}) => {
    // Prevent PostCSS from throwing when safe is defined
    const safe = options.safe === true;
    options.safe = null;

    const proc = postcss();

    if (typeof options.fontFamily !== 'undefined' || typeof options.minifyFontWeight !== 'undefined') {
        warnOnce('The fontFamily & minifyFontWeight options have been ' +
                 'consolidated into minifyFontValues, and are now deprecated.');
        if (!options.minifyFontValues) {
            options.minifyFontValues = options.fontFamily;
        }
    }

    if (typeof options.singleCharset !== 'undefined') {
        warnOnce('The singleCharset option has been renamed to ' +
                 'normalizeCharset, and is now deprecated.');
        options.normalizeCharset = options.singleCharset;
    }

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

        opts = assign({},
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

cssnano.process = (css, options = {}) => {
    options.map = options.map || (options.sourcemap ? true : null);
    return postcss([cssnano(options)]).process(css, options);
};

export default cssnano;
