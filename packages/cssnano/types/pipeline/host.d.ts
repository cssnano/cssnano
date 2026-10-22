import type { Helpers, Plugin, Result, Root } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
export type Reducer = (buffer: ValueBuffer, context: number) => void;
export type ValueStage = {
    forProperty: (property: string) => Reducer | null;
    run?: (root: Root, helpers: Helpers) => void;
};
export type PhaseStage = {
    run: (root: Root, helpers: Helpers) => void;
};
export type Stage = ValueStage | PhaseStage;
export type StageDescriptor = {
    start: (options: Record<PropertyKey, unknown>, result: Result) => (() => Stage) | null;
};
export type StageMember = {
    descriptor: StageDescriptor;
    options: Record<PropertyKey, unknown>;
};
/**
 * Makes a stage descriptor. Its `start` compiles the stage once per options
 * object and browser targets, and the memo lives in the descriptor. The frozen
 * targets of equal browserslist results are the same array, so the memo serves
 * every stylesheet.
 *
 * @param {{targets?: boolean, compile: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => (() => Stage) | null}} spec
 * @returns {StageDescriptor}
 */
export declare function stageDescriptor({ targets, compile }: {
    targets?: boolean;
    compile: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => (() => Stage) | null;
}): StageDescriptor;
/**
 * @param {readonly StageMember[]} members the stages of one run, in order
 * @returns {Plugin}
 */
export declare function hostPlugin(members: readonly StageMember[]): Plugin;
//# sourceMappingURL=host.d.ts.map