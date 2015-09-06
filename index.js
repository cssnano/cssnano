'use strict';

var decamelize = require('decamelize');
var defined = require('defined');
var postcss = require('postcss');
var warnOnce = require('./lib/warnOnce');

var processors = {
    postcssFilterPlugins: function () {
        return require('postcss-filter-plugins')({silent: true});
    },
    postcssDiscardComments: require('postcss-discard-comments'),
    postcssSvgo: require('postcss-svgo'),
    autoprefixer: require('autoprefixer'),
    postcssZindex: require('postcss-zindex'),
    postcssConvertValues: require('postcss-convert-values'),
    postcssCalc: require('postcss-calc'),
    postcssColormin: require('postcss-colormin'),
    postcssOrderedValues: require('postcss-ordered-values'),
    filterOptimiser: require('./lib/filterOptimiser'),
    postcssMinifySelectors: require('postcss-minify-selectors'),
    postcssMinifyParams: require('postcss-minify-params'),
    postcssSingleCharset: require('postcss-single-charset'),
    // minify-font-values should be run before discard-unused
    postcssMinifyFontValues: require('postcss-minify-font-values'),
    postcssDiscardUnused: require('postcss-discard-unused'),
    postcssNormalizeUrl: require('postcss-normalize-url'),
    core: require('./lib/core'),
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    postcssMergeIdents: require('postcss-merge-idents'),
    postcssReduceIdents: require('postcss-reduce-idents'),
    postcssMergeLonghand: require('postcss-merge-longhand'),
    postcssDiscardDuplicates: require('postcss-discard-duplicates'),
    functionOptimiser: require('./lib/functionOptimiser'),
    postcssMergeRules: require('postcss-merge-rules'),
    postcssDiscardEmpty: require('postcss-discard-empty'),
    postcssUniqueSelectors: require('postcss-unique-selectors'),
    styleCache: require('./lib/styleCache')
};

var cssnano = postcss.plugin('cssnano', function (options) {
    options = options || {};

    var proc = postcss();
    var plugins = Object.keys(processors);
    var len = plugins.length;
    var i = 0;

    if (typeof options.fontFamily !== 'undefined' || typeof options.minifyFontWeight !== 'undefined') {
        warnOnce('The fontFamily & minifyFontWeight options have been ' +
                 'consolidated into minifyFontValues, and are now deprecated.');
        if (!options.minifyFontValues) {
            options.minifyFontValues = options.fontFamily;
        }
    }

    while (i < len) {
        var plugin = plugins[i++];
        var processor = processors[plugin];
        var method = processor;

        var shortName = plugin.replace('postcss', '');
        shortName = shortName.slice(0, 1).toLowerCase() + shortName.slice(1);

        var opts = defined(
            options[shortName],
            options[plugin],
            options[decamelize(plugin, '-')],
            {}
        );

        if (opts === false || opts.disable) {
            continue;
        }

        if (plugin === 'autoprefixer') {
            opts.add = false;
        }

        proc.use(method(opts));
    }

    return proc;
});

module.exports = cssnano;

module.exports.process = function (css, options) {
    options = options || {};
    options.map = options.map || (options.sourcemap ? true : null);
    return postcss([cssnano(options)]).process(css, options);
};
