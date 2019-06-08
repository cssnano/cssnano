import { plugin } from 'postcss';
import sort from 'alphanum-sort';
import { uniq } from 'ramda';

function unique(rule) {
  rule.selector = sort(uniq(rule.selectors), { insensitive: true }).join();
}

export default plugin('postcss-unique-selectors', () => {
  return (css) => css.walkRules(unique);
});
