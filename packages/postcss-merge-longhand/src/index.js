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
      /**
       * Whether a `columns` shorthand carries the same meaning as the longhands
       * it expands to depends on declarations elsewhere in the stylesheet, so
       * the family waits until the whole of it has been seen.
       *
       * @type {import('postcss').Rule[]}
       */
      const columnRules = [];
      let setsColumnHeight = false;

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
            setsColumnHeight ||= columns.setsColumnHeight(node);
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
          columnRules.push(rule);
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

      if (setsColumnHeight) {
        return;
      }

      for (const rule of columnRules) {
        columns.explode(rule);
        columns.merge(rule);
      }
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>} */ (
  pluginCreator
);
