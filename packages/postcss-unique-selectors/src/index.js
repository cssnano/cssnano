import sort from 'alphanum-sort';
import selectorParser from 'postcss-selector-parser';

function parseSelectors(selectors, callback) {
  return selectorParser(callback).processSync(selectors);
}

function unique(rule) {
  const uniqueSelectors = rule.selectors.filter((item, i) => {
    return i === rule.selectors.indexOf(item);
  });
  rule.selector = sort(uniqueSelectors, { insensitive: true }).join();
}

const pluginCreator = () => {
  return {
    postcssPlugin: 'postcss-unique-selectors',
    Rule(nodes) {
      let comments = [];
      nodes.selector = parseSelectors(nodes.selector, (selNode) => {
        selNode.walk((sel) => {
          if (sel.type === 'comment') {
            comments.push(sel.value);
            sel.remove();
            return;
          } else {
            return sel;
          }
        });
      });
      unique(nodes);
      nodes.selectors = nodes.selectors.concat(comments);
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;
