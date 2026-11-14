import { createRecordSymbolLists, recordSymbolVisit } from './symbolLists.js';
import { AT_RULE_BLOCK, RULE } from '../passes/ir/blockRecord.js';
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

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunState} from '../passes/ir/runDriver.js' */
/** @import {SymbolEntry} from './host.js' */
/** @import {CharsetScan} from '../passes/ir/charset.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {LonghandRound} from '../passes/merge/lib/longhand/canonicalize.js' */
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
 * The walk up over the records, before the end of the run. It holds what the
 * walk reads and edits for one stylesheet: which transforms are on, the symbol
 * lists, the charset scan and the browsers. Each entry gets `enter`, then
 * `visit`: `visit` runs normalizeWhitespace, uniqueSelectors, the symbol lists
 * and the charset scan, in that order, when each is on.
 */
class WalkUp {
  /** @type {BlockRecords} */
  #records;
  /** @type {RunContext} */
  #context;
  /** @type {boolean} */
  #normalize;
  /** @type {boolean} */
  #unique;
  /** @type {readonly string[] | undefined} */
  #browsers;
  /** @type {RecordSymbolLists | undefined} */
  #lists;
  /** @type {CharsetScan} */
  #scan;
  /** @type {boolean} */
  #charset;
  /** @type {LonghandRound | undefined} */
  #round;

  /**
   * @param {RunState} state the build of the stylesheet, after the merge transforms
   * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on
   * @param {ReadonlyMap<string, SymbolEntry>} symbols the advanced transforms on
   * @param {readonly string[] | undefined} browsers the targets the merge folded the summaries for
   * @param {LonghandRound | undefined} round the second longhand round, which the walk gives each block it enters
   */
  constructor(state, transforms, symbols, browsers, round) {
    this.#round = round;
    this.#records = state.records;
    this.#context = state.context;
    this.#normalize = transforms.has('normalizeWhitespace');
    this.#unique = transforms.has('uniqueSelectors');
    this.#browsers = browsers;
    this.#lists = symbols.size > 0 ? createRecordSymbolLists() : undefined;
    this.#scan = createCharsetScan(this.#lists !== undefined);
    this.#charset = transforms.has('normalizeCharset');
  }

  /**
   * Whether any visit runs, so a walk without discardEmpty can be skipped.
   *
   * @return {boolean}
   */
  get active() {
    return (
      this.#normalize ||
      this.#unique ||
      this.#lists !== undefined ||
      this.#charset ||
      this.#round !== undefined
    );
  }

  /**
   * The lists the symbol transforms read, when any is on.
   *
   * @return {RecordSymbolLists | undefined}
   */
  get lists() {
    return this.#lists;
  }

  /**
   * The charset scan, which the charset decision reads after the walk.
   *
   * @return {CharsetScan}
   */
  get scan() {
    return this.#scan;
  }

  /**
   * Runs the second round on a block the walk enters, before the block's
   * children and before its visit.
   *
   * @param {ArenaIndex} index
   * @return {void}
   */
  enter(index) {
    const records = this.#records;
    const { kind } = records.entry(index);
    if (this.#round && (kind === RULE || kind === AT_RULE_BLOCK)) {
      this.#round.block(records, index);
    }
  }

  /**
   * @param {ArenaIndex} index
   * @return {void}
   */
  visit(index) {
    const records = this.#records;
    const context = this.#context;
    const { tokenLists } = context;
    if (this.#normalize) {
      normalizeEntry(records, tokenLists, index, isFirstChild(records, index));
    }
    if (this.#unique) {
      const changed = uniqueRuleSelectors(records, context, index);
      // Folded summaries follow the ids the dedupe wrote, when the merge folded them.
      if (changed && this.#browsers) {
        fillRule(
          /** @type {import('../passes/ir/ruleRecord.js').RuleRecord} */ (
            records.entry(index)
          ),
          tokenLists,
          this.#browsers
        );
      }
    }
    if (this.#lists) recordSymbolVisit(records, tokenLists, this.#lists, index);
    if (this.#charset) charsetVisit(records, context, index, this.#scan);
  }
}

/**
 * The walk up over the records, before the end of the run. The per-entry
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
 * @param {LonghandRound} [round] the second longhand round of the run, which runs on each block the walk reaches
 * @return {void}
 */
export function walkUp(state, transforms, symbols, browsers, round) {
  const { records, context } = state;
  round?.root(records);
  // The stylesheet's trailing whitespace is removed with the rest of the raws.
  if (transforms.has('normalizeWhitespace')) writeRootAfter(records, '');
  const walk = new WalkUp(state, transforms, symbols, browsers, round);
  if (transforms.has('discardEmpty')) {
    discardEmptyRecords(records, context, walk);
  } else if (walk.active) {
    visitEntriesInOrder(records, records.root.index, (index) => {
      walk.enter(index);
      walk.visit(index);
    });
  }
  const { lists } = walk;
  if (lists) {
    /** @type {(index: ArenaIndex) => void} */
    const remove = transforms.has('discardEmpty')
      ? (index) => removeAndDiscardEmptiedRecords(records, context, index)
      : (index) => detachRecord(records, index);
    for (const { transform, options } of symbols.values()) {
      transform(lists, options, remove, records, context);
    }
  }
  const charsetOptions = transforms.get('normalizeCharset');
  if (charsetOptions) {
    if (lists) rescanNonAscii(records, context, walk.scan);
    decideCharset(
      records,
      context,
      walk.scan,
      /** @type {{add?: boolean}} */ (charsetOptions)
    );
  }
}
