import LayerCache from './lib/layerCache.js';
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
 * @property {number} [startIndex] The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
 */

/**
 * Rebases the z-index values of the walk after merge's lists to small
 * integers that keep their order. Rebasing is only safe when every index is
 * a positive number, so one negative value leaves them all alone.
 *
 * @param {SymbolLists} lists
 * @param {Options} options
 * @param {unknown} [_remove]
 * @param {TextTableType} [table] the text the walk stored; a standalone run
 *   has none
 * @return {void}
 */
export function zindexSymbols(
  lists,
  options,
  _remove,
  table = new TextTable()
) {
  /** @type {import('postcss').Declaration[]} */
  const nodes = lists.zIndexDecls.filter(isAttached);
  if (nodes.length === 0 || nodes.some((decl) => decl.value[0] === '-')) {
    return;
  }

  const cache = new LayerCache();
  for (const decl of nodes) {
    cache.addValue(decl.value);
  }
  cache.optimizeValues(options.startIndex || 1);

  for (const decl of nodes) {
    // Need to coerce to string so that the AST is updated correctly
    table.setText(decl, cache.getValue(decl.value).toString());
  }
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
     */
    OnceExit(css) {
      const lists = createSymbolLists();
      css.walk(symbolVisit(lists));
      zindexSymbols(lists, opts);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
