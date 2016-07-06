import postcss from 'postcss';

// rules
import border from './rules/border';
import boxShadow from './rules/boxShadow';
import flexFlow from './rules/flexFlow';
import transition from './rules/transition';

let rules = [
    border,
    boxShadow,
    flexFlow,
    transition,
];

export default postcss.plugin('postcss-ordered-values', () => {
    return css => css.walkDecls(decl => rules.forEach(rule => rule(decl)));
});
