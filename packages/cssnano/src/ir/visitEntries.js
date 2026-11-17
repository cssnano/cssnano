import { AT_RULE_BLOCK, RULE } from './blockRecord.js';

/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * Visits every entry under `container` in pre-order: each entry, then the
 * entries of its children. The next sibling is read before an entry is
 * visited, so a visit may remove it.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} container
 * @param {(index: ArenaIndex) => void} visit
 * @return {void}
 */
export function visitEntriesInOrder(records, container, visit) {
  const { links } = records;
  for (let entry = links.firstChild(container); entry !== -1;) {
    const next = links.nextSibling(entry);
    visit(entry);
    const { kind } = records.entry(entry);
    if (kind === RULE || kind === AT_RULE_BLOCK) {
      visitEntriesInOrder(records, entry, visit);
    }
    entry = next;
  }
}
