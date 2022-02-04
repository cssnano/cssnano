'use strict';
const selectorParser = require('postcss-selector-parser');

function parseSelectors(selectors, callback) {
  return selectorParser(callback).processSync(selectors);
}

function unique(rule) {
  const selector = [...new Set(rule.selectors)];
  selector.sort();
  rule.selector = selector.join();
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-unique-selectors',
    OnceExit(css) {
      css.walkRules((nodes) => {
        let comments = [];
        nodes.selector = parseSelectors(nodes.selector, (selNode) => {
          selNode.walk((sel) => {
            if (sel.type === 'comment') {
              comments.push(sel.value);
              sel.remove();
              return;
            } else {
              return;
            }
          });
        });
        unique(nodes);
        nodes.selectors = nodes.selectors.concat(comments);
      });
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
