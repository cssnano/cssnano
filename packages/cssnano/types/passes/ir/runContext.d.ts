import { BlockTable } from './blockTable.js';
import { DeclarationKeys } from './declarationKey.js';
import { PropertyTable } from './propertyTable.js';
import type { Root, Rule } from 'postcss';
import type { SelectorInfo } from '../merge/lib/rules/ensureCompatibility.js';
import type { RuleMeta } from '../merge/lib/rules/ruleMeta.js';
export type RunContext = {
    properties: PropertyTable;
    declarations: DeclarationKeys;
    createdBlocks: Set<Rule> | null;
    blocks: BlockTable;
    selectorCompatibility: Map<string, SelectorInfo>;
    compatibleRules: WeakSet<Rule>;
    ruleMeta: WeakMap<Rule, RuleMeta>;
};
/** @import {Root, Rule} from 'postcss' */
/** @import {SelectorInfo} from '../merge/lib/rules/ensureCompatibility.js' */
/** @import {RuleMeta} from '../merge/lib/rules/ruleMeta.js' */
/**
 * The state one run of the merge pass shares across its transforms. Nothing in
 * it may outlive the run: its ids mean nothing to another stylesheet.
 *
 * @typedef {{
 *   properties: PropertyTable,
 *   declarations: DeclarationKeys,
 *   createdBlocks: Set<Rule> | null,
 *   blocks: BlockTable,
 *   selectorCompatibility: Map<string, SelectorInfo>,
 *   compatibleRules: WeakSet<Rule>,
 *   ruleMeta: WeakMap<Rule, RuleMeta>,
 * }} RunContext
 */
/**
 * A fresh context for one run. `createdBlocks` stays null unless the caller
 * collects the rules a merge creates. `root` is the stylesheet the run edits:
 * its block table caches summaries only when it is given.
 *
 * @param {Root} [root]
 * @return {RunContext}
 */
export declare function createRunContext(root?: Root): RunContext;
//# sourceMappingURL=runContext.d.ts.map