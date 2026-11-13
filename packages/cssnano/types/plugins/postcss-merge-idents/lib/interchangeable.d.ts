import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { DeclarationKeys } from '../../../passes/ir/declarationKey.js';
export type Group = Array<{
    name: string;
    copies: AtRuleEntry[];
}>;
export type AtRuleEntry = {
    rule: ArenaIndex;
    body?: number;
    layerPriority: number[];
    documentIndex: number;
    family: string;
    containerId: number;
    layerKey?: string;
    parsed: {
        isString: boolean;
        isReservedName: boolean;
        key: string;
        tokenText: string;
    };
};
/**
 * Makes each name of a group of interchangeable names, except the one that
 * wins the cascade, refer to the winner. A name that substituted text may
 * spell keeps its definition and is preferred as the merge target.
 *
 * @param {Group} group
 * @param {Set<string>} protectedNames
 * @param {Map<string, import('./valueRewriter.js').Replacement>} renames
 * @param {Set<ArenaIndex>} removals
 * @return {void}
 */
declare function mergeInterchangeable(group: Group, protectedNames: Set<string>, renames: Map<string, import('./valueRewriter.js').Replacement>, removals: Set<ArenaIndex>): void;
/**
 * Finds the groups of interchangeable names of one namespace and removes
 * repeat definitions of a single name. Two names are interchangeable when
 * their definitions, in cascade order, sit in the same at-rule families and
 * condition containers with the same bodies: whichever definition a browser
 * picks for one name, it picks the same body for the other. This lets
 * `@-webkit-keyframes` and `@keyframes` pairs merge although their bodies
 * differ. A string and an ident of one value are one name. Bodies are
 * serialized only for names that share where they are defined.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys
 * @param {AtRuleEntry[]} entries
 * @param {Set<ArenaIndex>} removals
 * @return {Group[]} groups of two or more names
 */
declare function findInterchangeableGroups(records: BlockRecords, keys: DeclarationKeys, entries: AtRuleEntry[], removals: Set<ArenaIndex>): Group[];
export { findInterchangeableGroups, mergeInterchangeable };
//# sourceMappingURL=interchangeable.d.ts.map