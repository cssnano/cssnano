'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');

var functions = [
    'calc',
    'cubic-bezier',
    'gradient',
    'rect',
    'rotate3d',
    'scale',
    'scale3d',
    'transform3d',
    'translate3d',
    'url',
    'var'
];

function walkTrim (nodes) {
    var i;
    parser.trim(nodes);
    for (i = nodes.length - 1; ~i; i -= 1) {
        if (nodes[i].type === 'function') {
            walkTrim(nodes[i].nodes);
        }
    }
}

function optimise (decl) {
    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'function') {
            if (node.value === 'calc') {
                walkTrim(node.nodes);
                return false;
            }
            parser.trim(node.nodes);
            if (!~functions.indexOf(node.value)) {
                return false;
            }
        }
        if (node.type === 'div') {
            node.before = '';
            node.after = '';
        }
        if (node.type === 'space') {
            node.value = ' ';
        }
    }).toString();
}

module.exports = postcss.plugin('cssnano-function-optimiser', function () {
    return function (css) {
        css.walkDecls(optimise);
    };
});
