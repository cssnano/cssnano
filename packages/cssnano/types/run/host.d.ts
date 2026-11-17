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
 * A host plugin runs the stages of one run in order, at OnceExit, so the
 * plugins before it have finished. The records are walked twice: down before
 * the merge, and up after it.
 */
/** @import {Plugin, Root} from 'postcss' */
/** @import {DeclarationPlans} from './declarationWalk.js' */
/** @import {ValueBuffer} from '../values/valueBuffer.js' */
/** @import {RunPlan} from './hostPlan.js' */
/**
 * Changes the buffer of one declaration. A reducer never sees a node; the
 * context is the bits of `context.js` for where the declaration sits.
 * @typedef {(buffer: ValueBuffer, context: number) => void} Reducer
 */
/**
 * A rewrite of an at-rule prelude, which edits its buffer as a declaration's
 * value does. `tightensAfterName` lets the walk strip the space after the name
 * once the stage has run on a non-empty prelude that starts with a parenthesis,
 * as CSS needs no space there. Only minifyParams sets it, for `@media` and
 * `@supports`.
 * @typedef {{buffer: Reducer, tightensAfterName?: true}} AtRulePart
 */
/**
 * A stage changes declaration values, through `forProperty`, which gives the
 * reducer of each property it treats, or null for a property it leaves alone.
 * It rewrites at-rule preludes through `forAtRule`, and selectors through
 * `selector`, in the same walk. A selector reducer edits the buffer of the
 * selector, as a value reducer edits its declaration's. `comments` gives the
 * predicate that removes comments for one stylesheet; it is called once per
 * stylesheet, and only one stage of a run has it.
 * @typedef {object} Stage
 * @property {(property: string) => Reducer | null} [forProperty]
 * @property {(name: string) => AtRulePart | null} [forAtRule]
 * @property {Reducer} [selector]
 * @property {() => (comment: string) => boolean} [comments]
 */
/**
 * The entry of a stage in a preset. `create` builds the stage from the options
 * of the entry and, when the entry reads them, the browser targets. It returns
 * null when the stage would do nothing. `create` is declared as a method so that
 * an entry can take the narrower options its plugin documents; the options are
 * validated against those keys before the host calls it.
 * @template [Options=Record<PropertyKey, unknown>]
 * @typedef {{create(options: Options, targets: readonly string[] | undefined): Stage | null}} StageEntry
 */
/**
 * A whole-stylesheet transform that the walk runs. `create` gets the options of
 * the entry and returns the options the walk runs the transform with, or null
 * when the transform is off. `create` is a method for the same reason as in
 * StageEntry.
 * @template [Options=Record<PropertyKey, unknown>]
 * @typedef {{create(options: Options): Record<PropertyKey, unknown> | null}} TransformEntry
 */
/**
 * An advanced transform over the records, which edits the lists of arena
 * indices that the walk up collected, with the options its entry's
 * `create` returned. `remove` removes an entry and, with discardEmpty on, each
 * ancestor it empties. It runs before the end of the run.
 * @typedef {(lists: import('./symbolLists.js').RecordSymbolLists, options: Record<PropertyKey, unknown>, remove: (index: import('../ir/blockRecord.js').ArenaIndex) => void, records: import('../ir/blockRecords.js').BlockRecords, context: import('./runContext.js').RunContext) => void} SymbolTransform
 */
/**
 * A symbol transform with the options its entry's `create` returned.
 * @typedef {{transform: SymbolTransform, options: Record<PropertyKey, unknown>}} SymbolEntry
 */
/**
 * The merge of a run: its options and its runner, which the preset gives so the
 * host does not import the merge pass. The browser targets come from the plan.
 * @typedef {{options: Record<PropertyKey, unknown>, runner: import('../merge/index.js').MergeRunner}} Merge
 */
/**
 * One stage entry of a host, with the options it is built with. `targets` is
 * set when the entry reads the browser targets.
 * @typedef {{entry: StageEntry, options: Record<PropertyKey, unknown>, targets: boolean}} HostMember
 */
/**
 * @param {RunPlan} plan the stages, merge, transforms and advanced transforms of one run
 * @returns {Plugin}
 */
export declare function hostPlugin(plan: RunPlan): Plugin;
//# sourceMappingURL=host.d.ts.map