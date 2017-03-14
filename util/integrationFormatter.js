import postcss from 'postcss';

export default postcss.plugin('_formatter', () => {
    return css => {
        css.walkRules(rule => {
            if (rule !== css.first) {
                rule.raws.before = '\n';
            }
        });
        css.walkAtRules(rule => {
            if (rule !== css.first) {
                rule.raws.before = '\n';
            }
            const name = rule.name;
            if (~name.indexOf('media') || ~name.indexOf('keyframes')) {
                rule.raws.after = '\n';
            }
            rule.walkRules(r => {
                r.raws.before = '\n  ';
            });
        });
    };
});
