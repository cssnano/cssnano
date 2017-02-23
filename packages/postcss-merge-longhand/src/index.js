import postcss from 'postcss';
import processors from './lib/decl';

export default postcss.plugin('postcss-merge-longhand', () => {
    return css => {
        css.walkRules(rule => {
            processors.forEach(p => {
                p.explode(rule);
                p.merge(rule);
            });
        });
    };
});
