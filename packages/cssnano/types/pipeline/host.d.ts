import type { Plugin } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
export type Reducer = (buffer: ValueBuffer, context: number) => void;
export type Warn = (message: string, plugin?: string) => void;
export type TextReducer = (text: string, context: number, warn: Warn) => string;
export type AtRulePart = TextReducer | {
    reduce: TextReducer;
    tightensAfterName: true;
};
export type Stage = {
    forProperty?: (property: string) => Reducer | null;
    forAtRule?: (name: string) => AtRulePart | null;
    selector?: TextReducer;
    comments?: () => (comment: string) => boolean;
};
export type StageEntry = {
    create: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => Stage | null;
};
export type PassRun = {
    pass: (css: import('postcss').Root, browsers: readonly string[], options: Record<PropertyKey, unknown>, result: import('postcss').Result) => void;
    options: Record<PropertyKey, unknown>;
    targets: boolean;
};
export type TransformEntry = {
    create: (options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown> | null;
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
 * @param {ReadonlyMap<string, PassRun>} [passes] the passes that run after the walk, by entry name
 * @returns {Plugin}
 */
export declare function hostPlugin(members: readonly HostMember[], transforms?: ReadonlyMap<string, Record<PropertyKey, unknown>>, passes?: ReadonlyMap<string, PassRun>): Plugin;
//# sourceMappingURL=host.d.ts.map