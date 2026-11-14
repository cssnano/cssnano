import { TokenType } from '@csstools/css-tokenizer';
import LayerCache from './lib/layerCache.js';
import {
  createRecordSymbolLists,
  isRecordAttached,
  recordSymbolVisit,
} from '../../pipeline/symbolLists.js';
import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { visitEntriesInOrder } from '../../passes/ir/visitEntries.js';
import { declaredValue } from '../../passes/ir/declaredText.js';
import { writeValue } from '../../passes/ir/valueEdits.js';
import { identifierWithText, numeric } from '../../values/tokenConstructors.js';

/** @import {ArenaIndex} from '../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../../passes/ir/declarationRecord.js' */
/** @import {RecordSymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {RunContext} from '../../passes/ir/runContext.js' */

/**
 * @typedef {object} Options
 * @property {number} [startIndex] The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
 */

/**
 * Rebases the z-index values of the walk up's lists to small
 * integers that keep their order. Rebasing is only safe when every index is
 * a positive number, so one negative value leaves them all alone.
 *
 * @param {RecordSymbolLists} lists
 * @param {Options} options
 * @param {unknown} _remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export function zindexSymbols(lists, options, _remove, records, context) {
  const { tokenLists } = context;
  /** @type {ArenaIndex[]} */
  const nodes = lists.zIndexDecls.filter(
    (index) =>
      isRecordAttached(records, index) &&
      hasOneComponent(records, context, index)
  );
  /** @param {ArenaIndex} index */
  const valueOf = (index) =>
    declaredValue(
      tokenLists,
      /** @type {DeclarationRecord} */ (records.entry(index))
    );
  if (nodes.length === 0 || nodes.some((index) => valueOf(index)[0] === '-')) {
    return;
  }

  const cache = new LayerCache();
  for (const index of nodes) {
    cache.addValue(valueOf(index));
  }
  cache.optimizeValues(options.startIndex || 1);

  for (const index of nodes) {
    writeValue(records, context, index, [
      tokenOf(cache.getValue(valueOf(index)).toString()),
    ]);
  }
}

/**
 * Whether the value is a single component. A value of several components is
 * invalid, and rewriting it to one number would make the declaration valid.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {boolean}
 */
function hasOneComponent(records, context, index) {
  const { valueList } = /** @type {DeclarationRecord} */ (records.entry(index));
  let count = 0;
  for (const [type] of context.tokenLists.get(valueList)) {
    if (type !== TokenType.Whitespace && type !== TokenType.Comment) count++;
  }
  return count === 1;
}

/**
 * The token of a z-index's new text: a number token for an integer, and an
 * identifier that keeps its text otherwise, such as `auto`.
 *
 * @param {string} text
 * @return {import('@csstools/css-tokenizer').CSSToken}
 */
function tokenOf(text) {
  return /^\d+$/v.test(text) ? numeric(text) : identifierWithText(text, text);
}

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-zindex',
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          const lists = createRecordSymbolLists();
          visitEntriesInOrder(records, records.root.index, (index) =>
            recordSymbolVisit(records, context.tokenLists, lists, index)
          );
          zindexSymbols(lists, opts, undefined, records, context);
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
