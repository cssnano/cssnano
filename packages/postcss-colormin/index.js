'use strict';

var colormin = require('./lib/colormin');
var postcss = require('postcss');
var parser = require('postcss-value-parser');

function extractColorArguments(nodes) {
    var i, max;
    var result = [];
    for (i = 0, max = nodes.length; i < max; i += 1) {
        if (nodes[i].type === 'word') {
            result.push(parseFloat(nodes[i].value));
        }
    }

    return result;
}

function reduceColor (decl) {
    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'function') {
            if (/^(rgb|hsl)a?$/.test(node.value)) {
                node.value = colormin(node.value, extractColorArguments(node.nodes));
                node.type = 'word';
            } else {
                node.before = node.after = '';
            }
        } else if (node.type === 'word') {
            node.value = colormin(node.value);
        }
    }).toString();
}

function reduceWhitespaces (decl) {
    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'function' || node.type === 'div') {
            node.before = node.after = '';
        }
    }).toString();
}

function transform (decl) {
    if (decl.prop === '-webkit-tap-highlight-color') {
        if (decl.value === 'inherit' || decl.value === 'transparent') {
            return;
        }
        reduceWhitespaces(decl);
    } else if (/^(?!font|filter)/.test(decl.prop)) {
        reduceColor(decl);
    }
}

module.exports = postcss.plugin('postcss-colormin', function () {
    return function (css) {
        css.walkDecls(transform);
    };
});
