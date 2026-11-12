import { DeclarationRecord } from './declarationRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord } from './blockRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type { NodeEntry } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type { BlockDeclarations } from '../merge/lib/longhand/blockDeclarations.js';
import type { RunContext } from './runContext.js';
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockDeclarations, DeclarationItem} from '../merge/lib/longhand/blockDeclarations.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {TokenListId} from './tokenLists.js' */
/**
 * Replaces the rule `record` with the rules `replacements`, which take its
 * place in the chain, in order. A replacement that already stands right before
 * `record` is the first of them and stays where it is; the others are linked
 * nowhere.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} record the index of the rule that is replaced
 * @param {ArenaIndex[]} replacements
 * @return {void}
 */
export declare function substitute(records: BlockRecords, record: ArenaIndex, replacements: ArenaIndex[]): void;
/**
 * Places the unplaced entry `entry` right before `sibling`, in the chain that
 * holds `sibling`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} sibling a linked entry that `entry` stands before
 * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
 * @return {ArenaIndex} the index the arena gave the entry
 */
export declare function placeBefore(records: BlockRecords, sibling: ArenaIndex, entry: BlockRecord | RuleRecord | DeclarationRecord | NodeEntry): ArenaIndex;
/**
 * Moves the rule `record` to the end of the chain of the block at `target`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} target the index of the block that takes the rule
 * @param {ArenaIndex} record the index of the rule
 * @return {void}
 */
export declare function moveRule(records: BlockRecords, target: ArenaIndex, record: ArenaIndex): void;
/**
 * Moves the chain of the block at `source` to the end of the chain of the
 * block at `target`. `source` is left with no children, since the caller
 * removes it. A nested block keeps its rule, which moves with the chain.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} target
 * @param {ArenaIndex} source
 * @return {void}
 */
export declare function adopt(records: BlockRecords, target: ArenaIndex, source: ArenaIndex): void;
/**
 * Appends a child to the chain of a rule, after its last child, and gives the
 * child the whitespace of that child when it has none. The node takes it at
 * write-back. A child that is linked elsewhere moves to the end.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule the index of the rule
 * @param {ArenaIndex} child the index of the child
 * @return {void}
 */
export declare function appendChild(records: BlockRecords, rule: ArenaIndex, child: ArenaIndex): void;
/**
 * Removes the declarations at the arena indices `claimed` from the chain of
 * the rule at `rule`. The node drops them at write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} rule
 * @param {Set<ArenaIndex>} claimed the declarations that leave, each a child of `rule`
 * @return {void}
 */
export declare function removeDeclarations(records: BlockRecords, rule: ArenaIndex, claimed: Set<ArenaIndex>): void;
/**
 * Moves the declarations at the arena indices `claimed`, in order, from the
 * chain of `source` to the end of the chain of `target`. The node of `source`
 * keeps them until write-back.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} source
 * @param {ArenaIndex} target
 * @param {ArenaIndex[]} claimed the declarations that move, in their chain order
 * @return {void}
 */
export declare function moveDeclarations(records: BlockRecords, source: ArenaIndex, target: ArenaIndex, claimed: ArenaIndex[]): void;
/**
 * Commits the working list of one block to the arena: the one edit the longhand
 * rounds make. The clones are placed first, each right after its source, so a
 * removed source still fixes where they land. Then the removals, then the
 * rewrites. The block's declaration stamp moves once when anything was
 * rewritten or cloned.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} container the index of the block or rule the list was read from
 * @param {BlockDeclarations} list the list, as the reducers left it
 * @return {void}
 */
export declare function commitDeclarations(records: BlockRecords, context: RunContext, container: ArenaIndex, list: BlockDeclarations): void;
//# sourceMappingURL=arenaEdits.d.ts.map