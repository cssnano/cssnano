import { plugin } from 'postcss';
import sort from 'alphanum-sort';
import uniqs from 'uniqs';
import selectorParser from 'postcss-selector-parser';

function parseSelectors(selectors, callback) {
  return selectorParser(callback).processSync(selectors);
}

function unique(rule) {
  rule.selector = sort(uniqs(rule.selectors), { insensitive: true }).join();
}

export default plugin('postcss-unique-selectors', () => {
  return (css) =>
    css.walkRules((nodes) => {
      nodes.selector = parseSelectors(nodes.selector, (selNode) => {
        selNode.walk((sel) => (sel.type === 'comment' ? sel.remove() : sel));
      });
      unique(nodes);
    });
});
