import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
import type { TokenListId } from '../passes/ir/tokenLists.js';
import type { DeclarationPlans } from './declarationWalk.js';
/**
 * Runs the at-rule part of the walk over one at-rule record, before its
 * children: its comments in the gap before the block and after the name, then
 * its prelude's fold through the plan of its name, and the space after the name
 * once the plan asks for it. The prelude is written only when its id changes.
 * `@charset` has no plan, since its name and encoding are read in the format
 * phase. A prelude that the build gives as empty is not folded.
 *
 * @param {DeclarationPlans} plans
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {number} context the context of the at-rule, with the bits of its own name
 * @param {ArenaIndex} index the at-rule's index, a block or a statement
 * @returns {TokenListId} the id of the prelude after the walk
 */
export declare function visitAtRule(plans: DeclarationPlans, records: BlockRecords, run: RunContext, context: number, index: ArenaIndex): TokenListId;
//# sourceMappingURL=atRuleWalk.d.ts.map