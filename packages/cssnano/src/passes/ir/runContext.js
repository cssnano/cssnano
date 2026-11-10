import { DeclarationKeys } from './declarationKey.js';
import { TextTable } from '../../values/textTable.js';
import { consistencyChecksEnabled } from './consistencyChecks.js';

/** @import {SelectorInfo} from '../merge/lib/rules/ensureCompatibility.js' */
/** @import {Container} from 'postcss' */

/**
 * The state one run of the merge pass shares across its transforms. Nothing in
 * it may outlive the run: its ids mean nothing to another stylesheet.
 *
 * @typedef {{
 *   declarations: DeclarationKeys,
 *   createdBlocks: Set<Container> | null,
 *   selectorCompatibility: Map<string, SelectorInfo>,
 *   textTable: TextTable,
 *   consistencyChecks: boolean,
 * }} RunContext
 */

/**
 * A fresh context for one run. `createdBlocks` stays null unless the caller
 * collects the rules a merge creates. `textTable` holds the selector tokens the
 * host walk left, which the run reads.
 *
 * @param {TextTable} [textTable]
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {RunContext}
 */
export function createRunContext(
  textTable = new TextTable(),
  consistencyChecks = consistencyChecksEnabled()
) {
  return {
    declarations: new DeclarationKeys(),
    createdBlocks: null,
    selectorCompatibility: new Map(),
    textTable,
    consistencyChecks,
  };
}
