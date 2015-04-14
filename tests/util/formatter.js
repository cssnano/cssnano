var postcss = require('postcss');

module.exports = postcss.plugin('_formatter', function () {
    return function (css) {
        css.eachRule(function (rule) {
            if (rule !== css.first) {
                rule.before = '\n';
            }
        });
        css.eachAtRule(function (rule) {
            if (rule !== css.first) {
                rule.before = '\n';
            }
            var name = rule.name;
            if (~name.indexOf('media') || ~name.indexOf('keyframes')) {
                rule.after = '\n';
            }
            rule.eachRule(function (r) {
                r.before = '\n  ';
            });
        });
    };
});
