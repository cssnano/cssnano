import { visitEntriesInOrder } from '../passes/ir/visitEntries.js';
import { isOutermostOverridable } from './overridable.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */

/**
 * The state of the record walk over one stylesheet: the outermost overridable
 * at-rules it has visited, in document order.
 */
class OverridableCollector {
  /** @type {ArenaIndex[]} */
  found = [];
  /** @type {BlockRecords} */
  #records;

  /** @param {BlockRecords} records */
  constructor(records) {
    this.#records = records;
  }

  /**
   * @param {ArenaIndex} index
   * @return {void}
   */
  visit(index) {
    if (isOutermostOverridable(this.#records, index)) this.found.push(index);
  }
}

/**
 * The record walk of a stylesheet, in document order: a container before its
 * children. In this step it collects the outermost overridable at-rules, which
 * the discard of discardOverridden compares.
 *
 * @param {BlockRecords} records the build of the stylesheet, after the node walk
 * @return {ArenaIndex[]} the outermost overridable at-rules, in document order
 */
export function walkDown(records) {
  const collector = new OverridableCollector(records);
  visitEntriesInOrder(records, records.root.index, (index) =>
    collector.visit(index)
  );
  return collector.found;
}
