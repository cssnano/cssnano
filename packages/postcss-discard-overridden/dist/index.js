'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OVERRIDABLE_RULES = ['keyframes', 'counter-style'];
var SCOPE_RULES = ['media', 'supports'];

function isOverridable(name) {
    return ~OVERRIDABLE_RULES.indexOf(_postcss2.default.vendor.unprefixed(name));
}

function isScope(name) {
    return ~SCOPE_RULES.indexOf(_postcss2.default.vendor.unprefixed(name));
}

function getScope(node) {
    var current = node.parent;
    var chain = [node.name, node.params];
    do {
        if (current.type === 'atrule' && isScope(current.name)) {
            chain.unshift(current.name + ' ' + current.params);
        }
        current = current.parent;
    } while (current);
    return chain.join('|');
}

exports.default = _postcss2.default.plugin('postcss-discard-overridden', function () {
    return function (css) {
        var cache = {};
        var rules = [];
        css.walkAtRules(function (node) {
            if (isOverridable(node.name)) {
                var scope = getScope(node);
                cache[scope] = node;
                rules.push({
                    node: node,
                    scope: scope
                });
            }
        });
        rules.forEach(function (rule) {
            if (cache[rule.scope] !== rule.node) {
                rule.node.remove();
            }
        });
    };
});