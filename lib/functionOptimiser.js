'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');

function walkSpaces (nodes) {
    var i, node;
    parser.trim(nodes);
    for (i = nodes.length - 1; ~i; i -= 1) {
        node = nodes[i];
        if (node.type === 'function') {
            walkSpaces(node.nodes);
        } else if (node.type === 'space') {
            node.value = ' ';
        }
    }
}

function optimise (decl) {
    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'div') {
            node.before = '';
            node.after = '';
        } else if (node.type === 'space') {
            node.value = ' ';
        } else if (node.type === 'function' && node.value === 'calc') {
            walkSpaces(node.nodes);
            return false;
        }
    }).toString();
}

module.exports = postcss.plugin('cssnano-function-optimiser', function () {
    return function (css) {
        css.walkDecls(optimise);
    };
});
