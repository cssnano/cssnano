'use strict';

var postcss = require('postcss');

function dedupe (node, index) {
    if (node.type === 'comment') { return; }
    if (node.nodes) { node.each(dedupe); }

    var toString = String(node);
    var nodes = node.parent.nodes;
    var result = [node];
    var i = index + 1;
    var max = nodes.length;

    for (; i < max; i++) {
        if (String(nodes[i]) === toString) {
            result.push(nodes[i]);
        }
    }

    result.forEach(function (n, i) {
        if (i !== result.length - 1) {
            n.removeSelf();
        }
    });
}

module.exports = postcss.plugin('postcss-discard-duplicates', function () {
    return function (css) {
        css.each(dedupe);
    };
});
