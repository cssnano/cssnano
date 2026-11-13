import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { uniqueRuleSelectors } from '../../passes/ir/uniqueSelectors.js';
import { visitEntriesInOrder } from '../../passes/ir/visitEntries.js';

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-unique-selectors',
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          visitEntriesInOrder(records, records.root.index, (index) => {
            uniqueRuleSelectors(records, context, index);
          });
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
