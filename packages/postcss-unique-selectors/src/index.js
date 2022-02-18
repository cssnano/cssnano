'use strict';
const selectorParser = require('postcss-selector-parser');

/**
 * @param {string} selectors
 * @param {selectorParser.SyncProcessor<void>} callback
 * @return {string}
 */
function parseSelectors(selectors, callback) {
  return selectorParser(callback).processSync(selectors);
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function unique(rule) {
  const selector = [...new Set(rule.selectors)];
  selector.sort();
  rule.selector = selector.join();
}

/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-unique-selectors',
    OnceExit(css) {
      css.walkRules((nodes) => {
        /** @type {string[]} */
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
