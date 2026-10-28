import encode from './lib/encode.js';
import counterReducer from './lib/counter.js';
import counterStyleReducer from './lib/counter-style.js';
import keyframesReducer from './lib/keyframes.js';
import gridTemplateReducer from './lib/grid-template.js';
import {
  createSymbolLists,
  isAttached,
  symbolVisit,
} from '../../pipeline/symbolLists.js';

import { TextTable } from '../../values/textTable.js';

/** @import {SymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {TextTable as TextTableType} from '../../values/textTable.js' */

/**
 * @typedef {object} Options
 * @property {boolean} [counter] Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
 * @property {boolean} [counterStyle] Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
 * @property {boolean} [keyframes] Reduces `keyframes` rules and `animation` declarations. (default: true)
 * @property {boolean} [gridTemplate] Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
 * @property {(value: string, index: number) => string} [encoder] Replaces a name. Receives the name and how many names came before it.
 */
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode, table: TextTableType) => void,
 *    transform: (table: TextTableType) => void
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
 * Renames the names that the walk after merge collected. Each reducer reads
 * only at-rules or declarations, so the lists hold every node it needs, and a
 * node that an earlier transform detached is skipped.
 *
 * @param {SymbolLists} lists
 * @param {{reducers: Reducer[]}} state
 * @param {unknown} [_remove]
 * @param {TextTableType} [table] the text the walk stored; a standalone run
 *   has none
 * @return {void}
 */
export function reduceIdentsSymbols(
  lists,
  { reducers },
  _remove,
  table = new TextTable()
) {
  const nodes = [...lists.keyframes, ...lists.counterStyles, ...lists.decls];
  for (const node of nodes) {
    if (!isAttached(node)) continue;
    for (const reducer of reducers) {
      reducer.collect(node, table);
    }
  }
  for (const reducer of reducers) {
    reducer.transform(table);
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
     */
    OnceExit(css) {
      const lists = createSymbolLists();
      css.walk(symbolVisit(lists));
      reduceIdentsSymbols(lists, state);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
