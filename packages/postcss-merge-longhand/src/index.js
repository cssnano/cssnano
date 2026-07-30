'use strict';
const borders = require('./lib/decl/borders.js');
const columns = require('./lib/decl/columns.js');
const margin = require('./lib/decl/margin.js');
const padding = require('./lib/decl/padding.js');
/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-longhand',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walkRules((rule) => {
        // Scan the rule's props once, then run only the processors whose
        // family is present.
        let hasBorder = false;
        let hasColumn = false;
        let hasMargin = false;
        let hasPadding = false;
        for (const node of rule.nodes) {
          if (node.type !== 'decl') {
            continue;
          }
          const prop = node.prop.toLowerCase();
          if (prop.startsWith('border')) {
            hasBorder = true;
          } else if (prop.startsWith('column')) {
            hasColumn = true;
          } else if (prop.startsWith('margin')) {
            hasMargin = true;
          } else if (prop.startsWith('padding')) {
            hasPadding = true;
          }
        }
        if (hasBorder) {
          borders.explode(rule);
          borders.merge(rule);
        }
        if (hasColumn) {
          columns.explode(rule);
          columns.merge(rule);
        }
        if (hasMargin) {
          margin.explode(rule);
          margin.merge(rule);
        }
        if (hasPadding) {
          padding.explode(rule);
          padding.merge(rule);
        }
      });
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>} */ (
  pluginCreator
);
