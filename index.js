'use strict';

var postcss = require('postcss');

function createProcessor (module, namespace) {
    return function (options) {
        var opts = options && namespace ? options[namespace] : opts;
        var ns = require(module)(opts);
        ns._disabled = opts === false;
        return ns;
    };
}

var pipeline = {
    discardComments: createProcessor('postcss-discard-comments', 'comments'),
    zindex: createProcessor('postcss-zindex', 'zindex'),
    discardEmpty: createProcessor('postcss-discard-empty'),
    minifyFontWeight: createProcessor('postcss-minify-font-weight'),
    convertValues: createProcessor('postcss-convert-values'),
    calc: createProcessor('postcss-calc', 'calc'),
    colormin: createProcessor('postcss-colormin'),
    pseudoElements: createProcessor('postcss-pseudoelements'),
    filterOptimiser: createProcessor('./lib/filterOptimiser'),
    longhandOptimiser: createProcessor('./lib/longhandOptimiser'),
    minifySelectors: createProcessor('postcss-minify-selectors'),
    singleCharset: createProcessor('postcss-single-charset'),
    // font-family should be run before discard-font-face
    fontFamily: createProcessor('postcss-font-family'),
    discardFontFace: createProcessor('postcss-discard-font-face'),
    normalizeUrl: createProcessor('postcss-normalize-url', 'urls'),
    reduceIdents: createProcessor('postcss-reduce-idents', 'idents'),
    core: createProcessor('./lib/core'),
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    borderOptimiser: createProcessor('./lib/borderOptimiser'),
    discardDuplicates: createProcessor('postcss-discard-duplicates'),
    functionOptimiser: createProcessor('./lib/functionOptimiser'),
    mergeRules: createProcessor('postcss-merge-rules', 'merge')
};

function cssnano (css, options) {
    if (typeof css === 'object') {
        options = css;
    }
    options = options || {};
    options.map = options.map || (options.sourcemap ? true : null);
    var processor = postcss();
    Object.keys(pipeline).forEach(function (module) {
        var fn = pipeline[module](options);
        if (!fn._disabled) {
            processor.use(fn);
        }
    });
    if (typeof css === 'string') {
        var result = processor.process(css, options);
        // return a css string if inline/no sourcemap.
        if (options.map === null || (options.map === true || options.map.inline)) {
            return result.css;
        }
        // otherwise return an object of css & map
        return result;
    } else {
        return processor;
    }
}

module.exports = cssnano;
