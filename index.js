'use strict';

var Postcss = require('postcss');

var processors = {
    'postcss-discard-comments': 'comments',
    'postcss-zindex': 'zindex',
    'postcss-discard-empty': null,
    'postcss-minify-font-weight': null,
    'postcss-convert-values': null,
    'postcss-calc': 'calc',
    'postcss-colormin': null,
    'postcss-pseudoelements': null,
    './lib/filterOptimiser': null,
    './lib/longhandOptimiser': null,
    'postcss-minify-selectors': null,
    'postcss-single-charset': null,
    // font-family should be run before discard-font-face
    'postcss-font-family': null,
    'postcss-discard-font-face': null,
    'postcss-normalize-url': 'urls',
    './lib/core': null,
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    'postcss-merge-idents': 'idents',
    'postcss-reduce-idents': 'idents',
    './lib/borderOptimiser': null,
    'postcss-discard-duplicates': null,
    './lib/functionOptimiser': null,
    'postcss-merge-rules': 'merge',
    'postcss-unique-selectors': null
};

module.exports = function cssnano(css, options) {
    if (typeof css === 'object') {
        options = css;
        css = null;
    }

    options = typeof options === 'object' ? options : {};
    options.map = options.map || (options.sourcemap ? true : null);

    var postcss = Postcss();
    var plugins = Object.keys(processors);
    var len = plugins.length;
    var i = 0;

    while (i < len) {
        var plugin = plugins[i++];
        var ns = processors[plugin];
        var opts = options[ns] || options;

        if (opts[ns] === false || opts.disable) {
            continue;
        }

        postcss.use(require(plugin)(opts));
    }

    if (typeof css === 'string') {
        var result = postcss.process(css, options);
        // return a css string if inline/no sourcemap.
        if (options.map === null || options.map === true || (options.map && options.map.inline)) {
            return result.css;
        }
        // otherwise return an object of css & map
        return result;
    }

    return postcss;
};
