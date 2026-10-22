import type { Helpers, Plugin, Root } from 'postcss';
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
    /**
     * whether the stage reads the browser targets
     */
    targets?: boolean;
    compile: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => (() => Stage) | null;
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