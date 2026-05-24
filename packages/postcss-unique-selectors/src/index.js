'use strict';
const selectorParser = require('postcss-selector-parser');

/**
 * @param {string} selectors
 * @return {string}
 */
function generateUniqueSelector(selectors) {
  // No comma => no top-level selector list => nothing to dedupe or sort.
  if (selectors.indexOf(',') === -1) {
    return selectors;
  }
  /** @type {Map<string, string>} */
  const uniqueSelectors = new Map();
  // If the input has no comment marker, every per-node clone+walk to strip
  // comments out of the dedupe key is wasted work; the node's own toString is
  // already comment-free.
  const hasComments = selectors.indexOf('/*') !== -1;

  /** @type {selectorParser.SyncProcessor<void>} */
  const collectUniqueSelectors = (selNode) => {
    for (const node of selNode.nodes) {
      if (!hasComments) {
        const text = node.toString();
        const key = text.trim();
        if (!uniqueSelectors.has(key)) {
          uniqueSelectors.set(key, text);
        }
        continue;
      }

      /** @type {string[]} */
      const comments = [];
      // Duplicates are removed by stripping the comments and using the results as the Map key.
      const keyNode = node.clone();
      keyNode.walk((sel) => {
        if (sel.type === 'comment') {
          comments.push(sel.value);
          sel.remove();
        }
      });
      const key = keyNode.toString().trim();

      const dupeSelector = uniqueSelectors.get(key);
      if (!dupeSelector) {
        uniqueSelectors.set(key, node.toString());
      } else if (comments.length) {
        // If the duplicate selector has a comment, it is concatenated to the end of the selector.
        uniqueSelectors.set(key, `${dupeSelector}${comments.join('')}`);
      }
    }
  };

  selectorParser(collectUniqueSelectors).processSync(selectors);

  return [...uniqueSelectors.entries()]
    .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
    .map(([, selector]) => selector)
    .join();
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
        if (nodes.raws.selector && nodes.raws.selector.raw) {
          nodes.raws.selector.raw = generateUniqueSelector(
            nodes.raws.selector.raw
          );
        } else {
          nodes.selector = generateUniqueSelector(nodes.selector);
        }
      });
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
