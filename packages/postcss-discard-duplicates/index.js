'use strict';

var postcss = require('postcss');

function dedupe (node) {
    if (node.nodes) { node.each(dedupe); }

    var nodes = node.parent.nodes.filter(function (n) {
        return String(n) === String(node);
    });

    nodes.forEach(function (n, i) {
        if (i !== nodes.length - 1) {
            n.removeSelf();
        }
    });
}

module.exports = postcss.plugin('postcss-discard-duplicates', function () {
    return function (css) {
        css.each(dedupe);
    };
});
