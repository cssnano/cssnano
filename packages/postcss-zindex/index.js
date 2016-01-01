'use strict';

var postcss = require('postcss');

module.exports = postcss.plugin('postcss-zindex', function () {
    return function (css) {
        var cache = require('./lib/layerCache')();
        var nodes = [];
        // First pass; cache all z indexes
        css.walkDecls('z-index', function (decl) {
            nodes.push(decl);
            cache.addValue(decl.value);
        });

        cache.optimizeValues();

        // Second pass; optimize
        nodes.forEach(function (decl) {
            // Need to coerce to string so that the
            // AST is updated correctly
            var value = cache.getValue(decl.value);
            decl.value = String(value);
        });
    };
});
