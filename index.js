'use strict';

var postcss = require('postcss');

var processors = {
    pluginFilter: function () {
        return require('postcss-filter-plugins')({silent: true});
    },
    discardComments: {fn: require('postcss-discard-comments'), ns: 'comments'},
    autoprefixer: {fn: require('autoprefixer-core'), ns: 'autoprefixer'},
    zindex: {fn: require('postcss-zindex'), ns: 'zindex'},
    minifyFontWeight: require('postcss-minify-font-weight'),
    convertValues: require('postcss-convert-values'),
    calc: {fn: require('postcss-calc'), ns: 'calc'},
    colormin: require('postcss-colormin'),
    pseudoelements: require('postcss-pseudoelements'),
    filterOptimiser: require('./lib/filterOptimiser'),
    minifySelectors: require('postcss-minify-selectors'),
    singleCharset: require('postcss-single-charset'),
    // font-family should be run before discard-unused
    fontFamily: {fn: require('postcss-font-family'), ns: 'fonts'},
    discardUnused: {fn: require('postcss-discard-unused'), ns: 'unused'},
    normalizeUrl: {fn: require('postcss-normalize-url'), ns: 'urls'},
    core: require('./lib/core'),
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    mergeIdents: {fn: require('postcss-merge-idents'), ns: 'idents'},
    reduceIdents: {fn: require('postcss-reduce-idents'), ns: 'idents'},
    mergeLonghand: require('postcss-merge-longhand'),
    discardDuplicates: require('postcss-discard-duplicates'),
    functionOptimiser: require('./lib/functionOptimiser'),
    mergeRules: {fn: require('postcss-merge-rules'), ns: 'merge'},
    discardEmpty: require('postcss-discard-empty'),
    uniqueSelectors: require('postcss-unique-selectors'),
    styleCache: require('./lib/styleCache')
};

var cssnano = postcss.plugin('cssnano', function (options) {
    options = options || {};

    var proc = postcss();
    var plugins = Object.keys(processors);
    var len = plugins.length;
    var i = 0;

    while (i < len) {
        var plugin = plugins[i++];
        var processor = processors[plugin];
        var opts = options[processor.ns] || options;
        var method;
        if (typeof processor === 'function') {
            method = processor;
        } else {
            if (opts[processor.ns] === false || opts.disable) {
                continue;
            }
            if (plugin === 'autoprefixer') {
                opts.add = false;
            }
            method = processor.fn;
        }
        proc.use(method(opts));
    }

    return proc;
});

module.exports = cssnano;

module.exports.process = function (css, options) {
    options = options || {};
    options.map = options.map || (options.sourcemap ? true : null);
    var result = postcss([cssnano(options)]).process(css, options);
    // return a css string if inline/no sourcemap.
    if (options.map === null || options.map === true || (options.map && options.map.inline)) {
        return result.css;
    }
    // otherwise return an object of css & map
    return result;
};
