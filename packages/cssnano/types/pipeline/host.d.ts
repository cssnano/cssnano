import type { Helpers, Plugin, Result, Root } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
export type Reducer = (buffer: ValueBuffer) => void;
export type ValueStage = {
    forProperty: (property: string) => Reducer | null;
};
export type PhaseStage = {
    run: (root: Root, helpers: Helpers) => void;
};
export type Stage = ValueStage | PhaseStage;
export type StageDescriptor = {
    build: (options: Record<PropertyKey, unknown>, result: Result) => Stage | null;
};
export type StageMember = {
    descriptor: StageDescriptor;
    options: Record<PropertyKey, unknown>;
};
/**
 * @param {readonly StageMember[]} members the stages of one run, in order
 * @returns {Plugin}
 */
export declare function hostPlugin(members: readonly StageMember[]): Plugin;
//# sourceMappingURL=host.d.ts.map