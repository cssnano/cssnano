import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { discardEmptyRecords } from '../../passes/ir/discardRecords.js';

const plugin = 'postcss-discard-empty';

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: plugin,
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          discardEmptyRecords(records, context);
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
