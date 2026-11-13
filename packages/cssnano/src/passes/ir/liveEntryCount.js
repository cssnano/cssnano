import { AT_RULE_BLOCK, COMMENT, RULE } from './blockRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */

/**
 * The rules, at-rules and declarations on the live chains, which bound the
 * rounds of a run. Comments do not count, and an entry a detach took out of
 * the tree does not either, since the walk starts at the stylesheet.
 *
 * @param {BlockRecords} records
 * @return {number}
 */
export function liveEntryCount(records) {
  const { links } = records;
  let count = 0;
  // A stack of containers still to walk. Each one pushes the containers it
  // holds, so the walk visits every chain once.
  const pending = [records.root.index];
  while (pending.length > 0) {
    const index = /** @type {number} */ (pending.pop());
    for (
      let entry = links.lastChild(index);
      entry !== -1;
      entry = links.prevSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item.kind !== COMMENT) count++;
      if (item.kind === RULE || item.kind === AT_RULE_BLOCK) {
        pending.push(item.index);
      }
    }
  }
  return count;
}
