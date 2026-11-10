import { DeclarationKeys } from './declarationKey.js';
import { TextTable } from '../../values/textTable.js';
import { TokenLists } from './tokenLists.js';
import type { Container } from 'postcss';
export type RunContext = {
    declarations: DeclarationKeys;
    createdBlocks: Set<Container> | null;
    textTable: TextTable;
    tokenLists: TokenLists;
    consistencyChecks: boolean;
};
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
export declare function createRunContext(textTable?: TextTable, consistencyChecks?: boolean): RunContext;
//# sourceMappingURL=runContext.d.ts.map