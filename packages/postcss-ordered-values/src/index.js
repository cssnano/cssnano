import postcss from 'postcss';

// rules
import border from './rules/border';
import flexFlow from './rules/flexFlow';

let rules = [
    border,
    flexFlow
];

export default postcss.plugin('postcss-ordered-values', () => {
    return css => css.walkDecls(decl => rules.forEach(rule => rule(decl)));
});
