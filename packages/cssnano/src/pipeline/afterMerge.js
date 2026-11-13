import rawCache from '../utils/rawCache.js';
import { createRecordSymbolLists, recordSymbolVisit } from './symbolLists.js';
import { visitEntriesInOrder } from '../passes/ir/visitEntries.js';
import { uniqueRuleSelectors } from '../passes/ir/uniqueSelectors.js';
import { fillRule } from '../passes/ir/selectorList.js';
import {
  createCharsetScan,
  charsetVisit,
  decideCharset,
  rescanNonAscii,
} from '../passes/ir/charset.js';
import {
  discardEmptyRecords,
  removeAndDiscardEmptiedRecords,
} from '../passes/ir/discardRecords.js';
import { remove as detachRecord } from '../passes/ir/treeEdits.js';
import { normalizeEntry } from '../passes/ir/normalizeRaws.js';
import { writeRootAfter } from '../passes/ir/rawEdits.js';

/** @import {Result, Root} from 'postcss' */
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunState} from '../passes/ir/runDriver.js' */
/** @import {SymbolEntry} from './host.js' */
/** @import {RecordSymbolLists} from './symbolLists.js' */

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
 * After the walk, the symbol transforms run in order over the lists, and then the
 * charset decision, all before the end writes the records.
 *
 * @param {RunState} state the build of the stylesheet, after the merge transforms
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @param {ReadonlyMap<string, SymbolEntry>} symbols the advanced transforms on, in order
 * @param {readonly string[]} [browsers] the targets the merge folded the summaries for; absent when it did not
 * @return {void}
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
  if (lists) {
    /** @type {(index: ArenaIndex) => void} */
    const remove = transforms.has('discardEmpty')
      ? (index) => removeAndDiscardEmptiedRecords(records, context, index)
      : (index) => detachRecord(records, index);
    for (const { transform, options } of symbols.values()) {
      transform(lists, options, remove, records, context);
    }
  }
  if (charsetOptions) {
    if (lists) rescanNonAscii(records, context, scan);
    decideCharset(
      records,
      context,
      scan,
      /** @type {{add?: boolean}} */ (charsetOptions)
    );
  }
}

/**
 * The stage after the end of the run: the raw cache, which records last so
 * that no later transform changes what it describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms
 * @returns {void}
 */
export function finishAfterMerge(root, result, transforms) {
  if (transforms.has('rawCache')) rawCache(result);
}
