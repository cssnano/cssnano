import { RULE } from './blockRecord.js';
import { tokensText } from '../values/tokensText.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {TokenListId, TokenLists} from './tokenLists.js' */

/**
 * The text a rule's or at-rule's raw separator follows: the last selector, or
 * the prelude.
 *

 * @param {TokenLists} tokenLists
 * @param {BlockRecord | NodeEntry | import('./ruleRecord.js').RuleRecord} record
 * @return {string}
 */
export function headText(tokenLists, record) {
  if (record.kind === RULE) {
    const { selectorIds } =
      /** @type {import('./ruleRecord.js').RuleRecord} */ (record);
    const last = selectorIds[selectorIds.length - 1];
    return last === undefined ? '' : tokensText(tokenLists.get(last));
  }
  const { preludeId } = /** @type {BlockRecord | NodeEntry} */ (record);
  return preludeId === -1
    ? ''
    : tokensText(tokenLists.get(/** @type {TokenListId} */ (preludeId)));
}
