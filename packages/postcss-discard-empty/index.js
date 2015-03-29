'use strict';

function remove (callback) {
    return function (node) {
        callback.call(this, node) && node.removeSelf();
    };
}

module.exports = function () {
    return function (css) {
        css.eachDecl(remove(function (decl) {
            return !decl.value;
        }));
        css.eachRule(remove(function (rule) {
            return !rule.selector.length || !rule.nodes.length;
        }));
        css.eachAtRule(remove(function (rule) {
            if (rule.nodes) {
                return !rule.nodes.length;
            }
            return !rule.params;
        }));
    };
};
