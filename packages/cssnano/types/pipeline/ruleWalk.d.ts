import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
import type { DeclarationPlans } from './declarationWalk.js';
/**
 * Runs the rule part of the walk over one rule record, before its children: its
 * comments between the selector and the block, then its selector's fold. The
 * selector is written only when its id changes, so a rule no stage or comment
 * removal changed keeps its written list.
 *
 * @param {DeclarationPlans} plans
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {number} context the context of the rule, with the bits of its own selector's fold
 * @param {ArenaIndex} index the rule's index
 */
export declare function visitRule(plans: DeclarationPlans, records: BlockRecords, run: RunContext, context: number, index: ArenaIndex): void;
//# sourceMappingURL=ruleWalk.d.ts.map