import { DeclarationKeys } from './declarationKey.js';
import { TextTable } from '../../values/textTable.js';
import { TokenLists } from './tokenLists.js';
import { consistencyChecksEnabled } from './consistencyChecks.js';
import { longstandingFeatures } from '../merge/lib/longhand/syntaxFeatures.js';

/** @import {Container} from 'postcss' */

/**
 * The state one run of the merge pass shares across its transforms. Nothing in
 * it may outlive the run: its ids mean nothing to another stylesheet.
 *
 * @typedef {{
 *   declarations: DeclarationKeys,
 *   createdBlocks: Set<Container> | null,
 *   textTable: TextTable,
 *   tokenLists: TokenLists,
 *   consistencyChecks: boolean,
 *   features: ReadonlySet<string>,
 * }} RunContext
 */

/**
 * A fresh context for one run. `createdBlocks` stays null unless the caller
 * collects the rules a merge creates. `textTable` holds the selector tokens the
 * host walk left, which the run reads.
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
    createdBlocks: null,
    textTable,
    tokenLists: new TokenLists(),
    consistencyChecks,
    features,
  };
}
