'use strict';

var postcss = require('postcss');
var valueParser = require('postcss-value-parser');

function reduceCalcWhitespaces (node) {
    if (node.type === 'space') {
        node.value = ' ';
    } else if (node.type === 'function') {
        node.before = node.after = '';
    }
}

function reduceWhitespaces (node) {
    if (node.type === 'space') {
        node.value = ' ';
    } else if (node.type === 'div') {
        node.before = node.after = '';
    } else if (node.type === 'function') {
        node.before = node.after = '';
        if (node.value === 'calc') {
            valueParser.walk(node.nodes, reduceCalcWhitespaces);
            return false;
        }
    }
}

function transformDecls (decl) {
    if (!/filter/.test(decl.prop)) {
        decl.value = valueParser(decl.value).walk(reduceWhitespaces).toString();
    }
}

module.exports = postcss.plugin('cssnano-function-optimiser', function () {
    return function (css) {
        css.walkDecls(transformDecls);
    };
});
