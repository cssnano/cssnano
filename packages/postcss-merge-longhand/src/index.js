import postcss from 'postcss';
import margin from './lib/decl/margin';
import padding from './lib/decl/padding';
import borders from './lib/decl/borders';
import columns from './lib/decl/columns';

const processors = [
    margin,
    padding,
    borders,
    columns,
];

export default postcss.plugin('postcss-merge-longhand', () => {
    return css => {
        css.walkRules(rule => {
            processors.forEach(p => p.explode(rule));
            processors.slice().reverse().forEach(p => p.merge(rule));
        });
    };
});
