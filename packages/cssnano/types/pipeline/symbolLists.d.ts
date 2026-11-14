import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { TokenLists } from '../passes/ir/tokenLists.js';
export type RecordSymbolLists = {
    fontFaces: ArenaIndex[];
    counterStyles: ArenaIndex[];
    keyframes: ArenaIndex[];
    namespaces: ArenaIndex[];
    namespaceRules: ArenaIndex[];
    fontDecls: ArenaIndex[];
    listStyleDecls: ArenaIndex[];
    animationDecls: ArenaIndex[];
    zIndexDecls: ArenaIndex[];
    layers: ArenaIndex[];
    functions: ArenaIndex[];
    parameterRules: ArenaIndex[];
    conditionRules: ArenaIndex[];
    decls: ArenaIndex[];
};
/**
 * The records that the advanced transforms read, by kind, as the arena indices
 * of the records: `@font-face` blocks, counter styles, keyframes, namespaces,
 * rules with a namespace bar, font and list-style and animation declarations,
 * z-index declarations, layers, functions, parameter rules, condition rules,
 * and every declaration.
 *
 * @typedef {{
 *   fontFaces: ArenaIndex[],
 *   counterStyles: ArenaIndex[],
 *   keyframes: ArenaIndex[],
 *   namespaces: ArenaIndex[],
 *   namespaceRules: ArenaIndex[],
 *   fontDecls: ArenaIndex[],
 *   listStyleDecls: ArenaIndex[],
 *   animationDecls: ArenaIndex[],
 *   zIndexDecls: ArenaIndex[],
 *   layers: ArenaIndex[],
 *   functions: ArenaIndex[],
 *   parameterRules: ArenaIndex[],
 *   conditionRules: ArenaIndex[],
 *   decls: ArenaIndex[],
 * }} RecordSymbolLists
 */
/**
 * @returns {RecordSymbolLists}
 */
export declare function createRecordSymbolLists(): RecordSymbolLists;
/**
 * Sorts every kept record of the stylesheet, in document order, into lists.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @returns {RecordSymbolLists}
 */
export declare function collectRecordSymbols(records: BlockRecords, tokenLists: TokenLists): RecordSymbolLists;
/**
 * Whether an entry still hangs from the stylesheet. A removed container's
 * children still name it as their parent, so the walk must reach the root.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @returns {boolean}
 */
export declare function isRecordAttached(records: BlockRecords, index: ArenaIndex): boolean;
/**
 * Sorts one kept record into the lists it belongs to. A rule's selector has a
 * namespace bar when one of its selector lists holds a `|` token.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {RecordSymbolLists} lists
 * @param {ArenaIndex} index
 * @returns {void}
 */
export declare function recordSymbolVisit(records: BlockRecords, tokenLists: TokenLists, lists: RecordSymbolLists, index: ArenaIndex): void;
//# sourceMappingURL=symbolLists.d.ts.map