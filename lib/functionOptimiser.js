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

function optimise (decl) {
    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'function') {
            parser.trim(node.nodes);
            if(!~functions.indexOf(node.value)) {
                return false;
            }
        }
        if (node.type === 'div' && node.value === ',') {
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
