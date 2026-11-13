import { DeclarationKeys } from './declarationKey.js';
import { TextTable } from '../../values/textTable.js';
import { TokenLists } from './tokenLists.js';
import { ValueIds } from './valueIds.js';
import { SelectorIds } from './selectorIds.js';
import { consistencyChecksEnabled } from './consistencyChecks.js';
import { longstandingFeatures } from './syntaxFeatures.js';

/**
 * The state one run of the merge pass shares across its transforms. Nothing in
 * it may outlive the run: its ids mean nothing to another stylesheet.
 *
 * @typedef {{
 *   declarations: DeclarationKeys,
 *   textTable: TextTable,
 *   tokenLists: TokenLists,
 *   valueIds: ValueIds,
 *   consistencyChecks: boolean,
 *   features: ReadonlySet<string>,
 *   messages: RunMessage[],
 *   selectorIds: SelectorIds,
 * }} RunContext
 */

/**
 * A message a transform made about one entry, appended in run order. The end
 * of the run turns it into a result message with the node of the entry: a
 * warning, which has `text`, goes through `result.warn`; a removal is pushed as
 * it is.
 *
 * @typedef {{index: import('./blockRecord.js').ArenaIndex, type: string, plugin?: string, text?: string}} RunMessage
 */

/**
 * A fresh context for one run. `textTable` holds the selector tokens the host
 * walk left, which the run reads.
 *
 * @param {TextTable} [textTable]
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @param {ReadonlySet<string>} [features] the features every browser target supports; the strict floor otherwise
 * @return {RunContext}
 */
export function createRunContext(
  textTable = new TextTable(),
  consistencyChecks = consistencyChecksEnabled(),
  features = longstandingFeatures
) {
  return {
    declarations: new DeclarationKeys(),
    textTable,
    tokenLists: new TokenLists(),
    valueIds: new ValueIds(),
    consistencyChecks,
    features,
    messages: [],
    selectorIds: new SelectorIds(),
  };
}
