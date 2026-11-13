import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
import type { CommentState } from './comments/nodeComments.js';
import type { PlanEntry } from './plan.js';
import type { Stage } from './host.js';
export type DeclarationPlans = {
    /**
     * in pipeline order
     */
    stages: readonly Stage[];
    /**
     * the plan of each property name as written
     */
    properties: Map<string, PlanEntry>;
    /**
     * the comment removal, or null when no stage removes comments
     */
    comments: CommentState | null;
    /**
     * whether normalizeWhitespace is on, which strips the stray semicolons
     */
    normalizeWhitespace: boolean;
};
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {CommentState} from './comments/nodeComments.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {Stage} from './host.js' */
/**
 * What the record walk applies to the declarations of one stylesheet: the
 * stages, the plan of each property seen so far, the comment removal, and
 * whether whitespace is normalized.
 * @typedef {object} DeclarationPlans
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PlanEntry>} properties the plan of each property name as written
 * @property {CommentState | null} comments the comment removal, or null when no stage removes comments
 * @property {boolean} normalizeWhitespace whether normalizeWhitespace is on, which strips the stray semicolons
 */
/**
 * @param {readonly Stage[]} stages in pipeline order
 * @param {boolean} normalizeWhitespace
 * @param {CommentState | null} comments
 * @returns {DeclarationPlans}
 */
export declare function declarationPlansOf(stages: readonly Stage[], normalizeWhitespace: boolean, comments: CommentState | null): DeclarationPlans;
/**
 * Runs the declaration part of the walk over one declaration record, in
 * document order: its stray semicolon, its comments, then its value's fold.
 * A value is written only when its id changes, so a declaration no stage or
 * comment removal changed stays unmarked.
 *
 * @param {DeclarationPlans} plans
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {number} context the context of the container that holds the declaration
 * @param {ArenaIndex} index the declaration's index
 */
export declare function visitDeclaration(plans: DeclarationPlans, records: BlockRecords, run: RunContext, context: number, index: ArenaIndex): void;
//# sourceMappingURL=declarationWalk.d.ts.map