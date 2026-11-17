import type { Plugin } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
import type { RunPlan } from './hostPlan.js';
export type Reducer = (buffer: ValueBuffer, context: number) => void;
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
export type SymbolTransform = (lists: import('./symbolLists.js').RecordSymbolLists, options: Record<PropertyKey, unknown>, remove: (index: import('../ir/blockRecord.js').ArenaIndex) => void, records: import('../ir/blockRecords.js').BlockRecords, context: import('./runContext.js').RunContext) => void;
export type SymbolEntry = {
    transform: SymbolTransform;
    options: Record<PropertyKey, unknown>;
};
export type Merge = {
    options: Record<PropertyKey, unknown>;
    runner: import('../merge/index.js').MergeRunner;
};
export type HostMember = {
    entry: StageEntry;
    options: Record<PropertyKey, unknown>;
    targets: boolean;
};
/**
 * @param {RunPlan} plan the stages, merge, transforms and advanced transforms of one run
 * @returns {Plugin}
 */
export declare function hostPlugin(plan: RunPlan): Plugin;
//# sourceMappingURL=host.d.ts.map