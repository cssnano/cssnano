import { TextTable } from '../values/textTable.js';
import type { Plugin } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
export type Reducer = (buffer: ValueBuffer, context: number) => void;
export type Warn = (message: string, plugin?: string) => void;
export type AtRulePart = {
    buffer: Reducer;
    tightensAfterName?: true;
};
export type Stage = {
    forProperty?: (property: string) => Reducer | null;
    forAtRule?: (name: string) => AtRulePart | null;
    selector?: Reducer;
    comments?: () => (comment: string) => boolean;
};
export type StageEntry<Options = Record<PropertyKey, unknown>> = {
    create(options: Options, targets: readonly string[] | undefined): Stage | null;
};
export type TransformEntry<Options = Record<PropertyKey, unknown>> = {
    create(options: Options): Record<PropertyKey, unknown> | null;
};
export type SymbolTransform = (lists: import('./symbolLists.js').RecordSymbolLists, options: Record<PropertyKey, unknown>, remove: (index: import('../passes/ir/blockRecord.js').ArenaIndex) => void, records: import('../passes/ir/blockRecords.js').BlockRecords, context: import('../passes/ir/runContext.js').RunContext) => void;
export type NodeSymbolTransform = (lists: import('./symbolLists.js').SymbolLists, options: Record<PropertyKey, unknown>, remove: (node: import('postcss').ChildNode) => void, table: TextTable) => void;
export type SymbolEntry = {
    transform: SymbolTransform | NodeSymbolTransform;
    options: Record<PropertyKey, unknown>;
    onRecords: boolean;
};
export type Merge = {
    options: Record<PropertyKey, unknown>;
    runner: import('../passes/merge/index.js').MergeRunner;
};
export type HostMember = {
    entry: StageEntry;
    options: Record<PropertyKey, unknown>;
    targets: boolean;
};
/**
 * @param {readonly HostMember[]} members the stages of one run, in order
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} [transforms] the options of the
 *   whole-stylesheet transforms that the walk runs, by entry name; a missing name is disabled
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} [after] the options of the transforms that
 *   the walk after the merge runs, by entry name; a missing name is disabled
 * @param {ReadonlyMap<string, SymbolEntry>} [symbols]
 *   the advanced transforms that run over the lists of the walk after the merge, in order
 * @param {Merge} [merge] the merge options with the browser targets, and the merge run; absent when the merge is off
 * @returns {Plugin}
 */
export declare function hostPlugin(members: readonly HostMember[], transforms?: ReadonlyMap<string, Record<PropertyKey, unknown>>, after?: ReadonlyMap<string, Record<PropertyKey, unknown>>, symbols?: ReadonlyMap<string, SymbolEntry>, merge?: Merge): Plugin;
//# sourceMappingURL=host.d.ts.map