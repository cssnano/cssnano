'use strict';

var postcss = require('postcss');

function minimiseWhitespace (rule) {
    rule.raws.before = rule.raws.between = rule.raws.after = '';
    rule.raws.semicolon = false;
}

module.exports = postcss.plugin('cssnano-core', function () {
    return function (css) {
        css.walkDecls(function (declaration) {
            // Ensure that !important values do not have any excess whitespace
            if (declaration.important) {
                declaration.raws.important = '!important';
            }
            // Trim unnecessary space around e.g. 12px / 18px
            declaration.value = declaration.value.replace(/\s*(\/)\s*/, '$1');
            if (~[
                    'outline',
                    'outline-left',
                    'outline-right',
                    'outline-top',
                    'outline-bottom'
                ].indexOf(declaration.prop)) {
                declaration.value = declaration.value.replace('none', '0');
            }
            // Remove whitespaces around ie 9 hack
            declaration.value = declaration.value.replace(/\s*(\\9)\s*/, '$1');
            // Remove extra semicolons and whitespace before the declaration
            if (declaration.raws.before) {
                declaration.raws.before = declaration.raws.before.replace(/[;\s]/g, '');
            }
            declaration.raws.between = ':';
            declaration.raws.semicolon = false;
        });

        css.walkRules(minimiseWhitespace);
        css.walkAtRules(minimiseWhitespace);

        // Remove final newline
        css.raws.after = '';
    };
});
