import postcss from 'postcss';

// rules
import border from './rules/border';
import boxShadow from './rules/boxShadow';
import flexFlow from './rules/flexFlow';

let rules = [
    border,
    boxShadow,
    flexFlow
];

export default postcss.plugin('postcss-ordered-values', () => {
    return css => css.walkDecls(decl => rules.forEach(rule => rule(decl)));
});
