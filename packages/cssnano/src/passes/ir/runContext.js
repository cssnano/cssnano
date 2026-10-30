import { DeclarationKeys } from './declarationKey.js';
import { PropertyTable } from './propertyTable.js';
import { TextTable } from '../../values/textTable.js';

/** @import {SelectorInfo} from '../merge/lib/rules/ensureCompatibility.js' */
/** @import {Rule} from 'postcss' */

/**
 * The state one run of the merge pass shares across its transforms. Nothing in
 * it may outlive the run: its ids mean nothing to another stylesheet.
 *
 * @typedef {{
 *   properties: PropertyTable,
 *   declarations: DeclarationKeys,
 *   createdBlocks: Set<Rule> | null,
 *   selectorCompatibility: Map<string, SelectorInfo>,
 *   textTable: TextTable,
 * }} RunContext
 */

/**
 * A fresh context for one run. `createdBlocks` stays null unless the caller
 * collects the rules a merge creates. `textTable` holds the selector tokens the
 * host walk left, which the run reads.
 *
 * @param {TextTable} [textTable]
 * @return {RunContext}
 */
export function createRunContext(textTable = new TextTable()) {
  return {
    properties: new PropertyTable(),
    declarations: new DeclarationKeys(),
    createdBlocks: null,
    selectorCompatibility: new Map(),
    textTable,
  };
}
