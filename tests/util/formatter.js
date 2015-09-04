'use strict';

var postcss = require('postcss');

module.exports = postcss.plugin('_formatter', function () {
    return function (css) {
        css.walkRules(function (rule) {
            if (rule !== css.first) {
                rule.raws.before = '\n';
            }
        });
        css.walkAtRules(function (rule) {
            if (rule !== css.first) {
                rule.raws.before = '\n';
            }
            var name = rule.name;
            if (~name.indexOf('media') || ~name.indexOf('keyframes')) {
                rule.raws.after = '\n';
            }
            rule.walkRules(function (r) {
                r.raws.before = '\n  ';
            });
        });
    };
});
