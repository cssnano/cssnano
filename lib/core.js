'use strict';

var postcss = require('postcss');

function minimiseWhitespace (rule) {
    rule.raws.before = rule.raws.between = rule.raws.after = '';
    rule.raws.semicolon = false;
}

module.exports = postcss.plugin('cssnano-core', function () {
    return function (css) {
        css.walkDecls(function (decl) {
            // Ensure that !important values do not have any excess whitespace
            if (decl.important) {
                decl.raws.important = '!important';
            }
            // Remove whitespaces around ie 9 hack
            decl.value = decl.value.replace(/\s*(\\9)\s*/, '$1');
            // Remove extra semicolons and whitespace before the declaration
            if (decl.raws.before) {
                decl.raws.before = decl.raws.before.replace(/[;\s]/g, '');
            }
            decl.raws.between = ':';
            decl.raws.semicolon = false;
        });

        css.walkRules(minimiseWhitespace);
        css.walkAtRules(minimiseWhitespace);

        // Remove final newline
        css.raws.after = '';
    };
});
