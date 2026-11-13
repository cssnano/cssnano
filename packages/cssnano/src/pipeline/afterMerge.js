import { removeAndDiscardEmptied } from '#postcss-discard-empty';
import { decideCharset, rescanNonAscii } from '#postcss-normalize-charset';
import rawCache from '../utils/rawCache.js';
import { createRecordSymbolLists, recordSymbolVisit } from './symbolLists.js';
import { visitEntriesInOrder } from '../passes/ir/visitEntries.js';
import { uniqueRuleSelectors } from '../passes/ir/uniqueSelectors.js';
import { fillRule } from '../passes/ir/selectorList.js';
import { createCharsetScan, charsetVisit } from '../passes/ir/charset.js';
import { discardEmptyRecords } from '../passes/ir/discardRecords.js';
import { normalizeEntry } from '../passes/ir/normalizeRaws.js';
import { writeRootAfter } from '../passes/ir/rawEdits.js';
import { nodeOf } from '../passes/ir/nodeTable.js';

/** @import {AnyNode, ChildNode, Result, Root} from 'postcss' */
/** @import {CharsetScan} from '#postcss-normalize-charset' */
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {NodeTable} from '../passes/ir/nodeTable.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {RunState} from '../passes/ir/runDriver.js' */
/** @import {SymbolTransform} from './host.js' */
/** @import {SymbolLists, RecordSymbolLists} from './symbolLists.js' */
/** @import {TextTable} from '../values/textTable.js' */

/**
 * What the walk over the records leaves for the stage after the run: the
 * symbol lists and the charset scan, as arena indices, and the charset options
 * when the charset decision is on.
 *
 * @typedef {{
 *   lists: RecordSymbolLists | undefined,
 *   scan: import('../passes/ir/charset.js').CharsetScan,
 *   charsetOptions: Record<PropertyKey, unknown> | undefined,
 * }} AfterWalk
 */

/**
 * Whether an entry is the stylesheet's first child.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {boolean}
 */
function isFirstChild(records, index) {
  const { links, root } = records;
  return (
    links.parentOf(index) === root.index &&
    links.firstChild(root.index) === index
  );
}

/**
 * The walk after merge over the records, before the end of the run. The per-entry
 * transforms share one walk: normalizeWhitespace visits each entry, the symbol
 * lists and the charset scan collect what the later stage reads. With discardEmpty
 * on, the walk is post-order and discards empty entries; otherwise it is pre-order.
 *
 * @param {RunState} state the build of the stylesheet, after the merge transforms
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} symbols
 *   the advanced transforms on, in order
 * @param {readonly string[]} [browsers] the targets the merge folded the summaries for; absent when it did not
 * @return {AfterWalk}
 */
export function walkAfterMerge(state, transforms, symbols, browsers) {
  const { records, context } = state;
  const { tokenLists } = context;
  // The stylesheet's trailing whitespace is removed with the rest of the raws.
  if (transforms.has('normalizeWhitespace')) writeRootAfter(records, '');
  /** @type {((index: ArenaIndex) => void)[]} */
  const visits = [];
  if (transforms.has('normalizeWhitespace')) {
    visits.push((index) =>
      normalizeEntry(records, tokenLists, index, isFirstChild(records, index))
    );
  }
  if (transforms.has('uniqueSelectors')) {
    visits.push((index) => {
      const changed = uniqueRuleSelectors(records, context, index);
      // Folded summaries follow the ids the dedupe wrote, when the merge folded them.
      if (changed && browsers) {
        fillRule(
          /** @type {import('../passes/ir/ruleRecord.js').RuleRecord} */ (
            records.entry(index)
          ),
          tokenLists,
          browsers
        );
      }
    });
  }
  const charsetOptions = transforms.get('normalizeCharset');
  const lists = symbols.size > 0 ? createRecordSymbolLists() : undefined;
  if (lists) {
    visits.push((index) =>
      recordSymbolVisit(records, tokenLists, lists, index)
    );
  }
  const scan = createCharsetScan(lists !== undefined);
  if (charsetOptions) {
    visits.push((index) => charsetVisit(records, context, index, scan));
  }
  /** @type {((index: ArenaIndex) => void) | undefined} */
  const visit =
    visits.length > 1
      ? (index) => {
          for (const each of visits) each(index);
        }
      : visits[0];
  if (transforms.has('discardEmpty')) {
    discardEmptyRecords(records, context, visit);
  } else if (visit) {
    visitEntriesInOrder(records, records.root.index, visit);
  }
  return { lists, scan, charsetOptions };
}

/**
 * The node of each index of a list, through the table the end of the run returns.
 *
 * @param {NodeTable} nodes
 * @param {ArenaIndex[]} indices
 * @return {AnyNode[]}
 */
function nodesOf(nodes, indices) {
  return indices.map((index) => /** @type {AnyNode} */ (nodeOf(nodes, index)));
}

/**
 * The symbol lists of the run as nodes, for the advanced transforms.
 *
 * @param {RecordSymbolLists} lists
 * @param {NodeTable} nodes
 * @return {SymbolLists}
 */
function nodeLists(lists, nodes) {
  return /** @type {SymbolLists} */ (
    Object.fromEntries(
      Object.entries(lists).map(([key, indices]) => [
        key,
        nodesOf(nodes, indices),
      ])
    )
  );
}

/**
 * The charset scan of the run as nodes. A removed charset keeps its node, so
 * the decision reads it as the walk left it.
 *
 * @param {import('../passes/ir/charset.js').CharsetScan} scan
 * @param {NodeTable} nodes
 * @return {CharsetScan}
 */
function nodeScan(scan, nodes) {
  const at = (/** @type {ArenaIndex} */ index) =>
    index === -1 ? undefined : /** @type {AnyNode} */ (nodeOf(nodes, index));
  return {
    first: /** @type {import('postcss').AtRule | undefined} */ (at(scan.first)),
    charsets: /** @type {import('postcss').AtRule[]} */ (
      nodesOf(nodes, scan.charsets)
    ),
    nonAscii: at(scan.nonAscii),
    candidates:
      scan.candidates === undefined
        ? undefined
        : nodesOf(nodes, scan.candidates),
  };
}

/**
 * The stage after the end of the run, on the nodes the end wrote: the advanced transforms over the symbol lists, the charset decision, then the raw
 * cache, which records last so that no later transform changes what it describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {NodeTable} nodes the node of each entry, from the end of the run
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} symbols
 * @param {TextTable} table the selectors and declarations the walk before merge stored
 * @param {AfterWalk} walked what the walk over the records left
 * @returns {void}
 */
export function finishAfterMerge(
  root,
  result,
  nodes,
  transforms,
  symbols,
  table,
  walked
) {
  const { lists, scan, charsetOptions } = walked;
  if (lists) {
    runSymbolTransforms(
      nodeLists(lists, nodes),
      symbols,
      result,
      transforms,
      table
    );
  }
  if (charsetOptions) {
    const charset = nodeScan(scan, nodes);
    if (lists) rescanNonAscii(charset);
    decideCharset(
      root,
      charset,
      /** @type {import('#postcss-normalize-charset').Options} */ (
        charsetOptions
      )
    );
  }
  if (transforms.has('rawCache')) rawCache(result);
}

/**
 * Runs the advanced transforms in preset order over the lists of the walk.
 * With discardEmpty on, a removal also removes the ancestors it empties.
 *
 * @param {SymbolLists} lists
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} symbols
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms
 * @param {TextTable} table
 * @returns {void}
 */
function runSymbolTransforms(lists, symbols, result, transforms, table) {
  /** @type {(node: ChildNode) => void} */
  const remove = transforms.has('discardEmpty')
    ? (node) => removeAndDiscardEmptied(node, result)
    : (node) => node.remove();
  for (const { transform, options } of symbols.values()) {
    transform(lists, options, remove, table);
  }
}
