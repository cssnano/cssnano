import postcss from 'postcss';
import { RULE } from './blockRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */

/**
 * Gives each merged rule among the children of a rebuilt container its node,
 * with the template's source. Write-back fills the rest.
 *
 * @param {BlockRecords} records
 * @param {number} container the index of the rebuilt container
 * @return {void}
 */
export function createChildNodes(records, container) {
  for (
    let entry = records.links.firstChild(container);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (record.kind === RULE && !record.hasNode) {
      const template = /** @type {import('postcss').Rule} */ (
        records.nodeOf(record.template)
      );
      // The node has no selector yet, which PostCSS's props type does not allow.
      record.giveNode(
        postcss.rule(
          /** @type {import('postcss').RuleProps} */ ({
            source: template.source,
          })
        )
      );
    }
  }
}
