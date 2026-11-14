import encode from './lib/encode.js';
import counterReducer from './lib/counter.js';
import counterStyleReducer from './lib/counter-style.js';
import keyframesReducer from './lib/keyframes.js';
import gridTemplateReducer from './lib/grid-template.js';
import {
  createRecordSymbolLists,
  isRecordAttached,
  recordSymbolVisit,
} from '../../pipeline/symbolLists.js';
import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { visitEntriesInOrder } from '../../passes/ir/visitEntries.js';

/** @import {ArenaIndex} from '../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {RecordSymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {RunContext} from '../../passes/ir/runContext.js' */

/**
 * @typedef {object} Options
 * @property {boolean} [counter] Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
 * @property {boolean} [counterStyle] Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
 * @property {boolean} [keyframes] Reduces `keyframes` rules and `animation` declarations. (default: true)
 * @property {boolean} [gridTemplate] Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
 * @property {(value: string, index: number) => string} [encoder] Replaces a name. Receives the name and how many names came before it.
 */
/** @typedef {{
 *    collect: (index: ArenaIndex, records: BlockRecords, context: RunContext) => void,
 *    transform: (records: BlockRecords, context: RunContext) => void
 *  }} Reducer
 */
/**
 * The reducers of the options, in the order they run. A plugin or preset
 * builds them once and keeps them across stylesheets, so stylesheets that one
 * processor minifies get distinct names and can share a page.
 *
 * @param {Options} options
 * @return {{reducers: Reducer[]}}
 */
export function createReducers({
  counter = true,
  counterStyle = true,
  keyframes = true,
  gridTemplate = true,
  encoder = (value, index) => encode(index),
}) {
  /** @type {Reducer[]} */
  const reducers = [];

  if (counter) {
    reducers.push(counterReducer(encoder));
  }
  if (counterStyle) {
    reducers.push(counterStyleReducer(encoder));
  }
  if (keyframes) {
    reducers.push(keyframesReducer(encoder));
  }
  if (gridTemplate) {
    reducers.push(gridTemplateReducer(encoder));
  }
  return { reducers };
}

/**
 * Renames the names that the walk up collected. Each reducer reads
 * only at-rules or declarations, so the lists hold every entry it needs, and an
 * entry that an earlier transform removed is skipped.
 *
 * @param {RecordSymbolLists} lists
 * @param {{reducers: Reducer[]}} state
 * @param {unknown} _remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export function reduceIdentsSymbols(
  lists,
  { reducers },
  _remove,
  records,
  context
) {
  const indices = [...lists.keyframes, ...lists.counterStyles, ...lists.decls];
  for (const index of indices) {
    if (!isRecordAttached(records, index)) continue;
    for (const reducer of reducers) {
      reducer.collect(index, records, context);
    }
  }
  for (const reducer of reducers) {
    reducer.transform(records, context);
  }
}

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  const state = createReducers(opts);
  return {
    postcssPlugin: 'postcss-reduce-idents',
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
          reduceIdentsSymbols(lists, state, undefined, records, context);
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
