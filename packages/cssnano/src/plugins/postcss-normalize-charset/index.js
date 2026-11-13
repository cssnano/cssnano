import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import {
  charsetVisit,
  createCharsetScan,
  decideCharset,
} from '../../passes/ir/charset.js';
import { visitEntriesInOrder } from '../../passes/ir/visitEntries.js';

const charset = 'charset';

/**
 * @typedef {object} Options
 * @property {boolean} [add] Adds a `@charset` when the file has non-ASCII characters and no charset. (default: true; the default preset sets false)
 */

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-normalize-' + charset,

    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          const scan = createCharsetScan();
          visitEntriesInOrder(records, records.root.index, (index) => {
            charsetVisit(records, context, index, scan);
          });
          decideCharset(records, context, scan, opts);
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
