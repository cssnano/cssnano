import decamelize from 'decamelize';
import defined from 'defined';
import assign from 'object-assign';
import postcss from 'postcss';
import warnOnce from './lib/warnOnce';

// Processors
import postcssFilterPlugins from 'postcss-filter-plugins';
import postcssDiscardComments from 'postcss-discard-comments';
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
import functionOptimiser from './lib/functionOptimiser';
import filterOptimiser from './lib/filterOptimiser';
import reducePositions from './lib/reducePositions';
import core from './lib/core';
import postcssMergeIdents from 'postcss-merge-idents';
import postcssReduceIdents from 'postcss-reduce-idents';
import postcssMergeLonghand from 'postcss-merge-longhand';
import postcssDiscardDuplicates from 'postcss-discard-duplicates';
import postcssDiscardOverridden from 'postcss-discard-overridden';
import postcssMergeRules from 'postcss-merge-rules';
import postcssDiscardEmpty from 'postcss-discard-empty';
import postcssUniqueSelectors from 'postcss-unique-selectors';
import styleCache from './lib/styleCache';

let processors = {
    postcssFilterPlugins: function () {
        return postcssFilterPlugins({silent: true});
    },
    postcssDiscardComments: postcssDiscardComments,
    postcssMinifyGradients: postcssMinifyGradients,
    postcssSvgo: postcssSvgo,
    postcssReduceTransforms: postcssReduceTransforms,
    autoprefixer: autoprefixer,
    postcssZindex: postcssZindex,
    postcssConvertValues: postcssConvertValues,
    postcssCalc: postcssCalc,
    postcssColormin: postcssColormin,
    postcssOrderedValues: postcssOrderedValues,
    postcssMinifySelectors: postcssMinifySelectors,
    postcssMinifyParams: postcssMinifyParams,
    postcssNormalizeCharset: postcssNormalizeCharset,
    postcssDiscardOverridden: postcssDiscardOverridden,
    // minify-font-values should be run before discard-unused
    postcssMinifyFontValues: postcssMinifyFontValues,
    postcssDiscardUnused: postcssDiscardUnused,
    postcssNormalizeUrl: postcssNormalizeUrl,
    functionOptimiser: functionOptimiser,
    filterOptimiser: filterOptimiser,
    reducePositions: reducePositions,
    core: core,
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    postcssMergeIdents: postcssMergeIdents,
    postcssReduceIdents: postcssReduceIdents,
    postcssMergeLonghand: postcssMergeLonghand,
    postcssDiscardDuplicates: postcssDiscardDuplicates,
    postcssMergeRules: postcssMergeRules,
    postcssDiscardEmpty: postcssDiscardEmpty,
    postcssUniqueSelectors: postcssUniqueSelectors,
    styleCache: styleCache
};

let defaultOptions = {
    autoprefixer: {
        add: false
    },
    postcssConvertValues: {
        length: false
    },
    postcssNormalizeCharset: {
        add: false
    }
};

let safeOptions = {
    postcssConvertValues: {
        length: false
    },
    postcssDiscardUnused: {
        disable: true
    },
    postcssReduceIdents: {
        counterStyle: false,
        keyframes: false
    },
    postcssZindex: {
        disable: true
    }
};

let cssnano = postcss.plugin('cssnano', (options = {}) => {
    if (options.safe) {
        options.isSafe = options.safe;
        options.safe = null;
    }

    let safe = options.isSafe === true;
    let proc = postcss();

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
