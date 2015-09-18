'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');

function filterOptimiser (decl) {
    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'function') {
            parser.trim(node.nodes);
        }
        if (node.type === 'div' && node.value === ',') {
            node.before = '';
            node.after = '';
        }
    }).toString();
}

module.exports = postcss.plugin('cssnano-filter-optimiser', function () {
    return function (css) {
        css.walkDecls(/filter/, filterOptimiser);
    };
});
