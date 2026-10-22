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
/**
 * Runs a plugin that changes the stylesheet only at OnceExit, in the place of
 * the host's stage. A plugin with any other listener would need a walk that
 * the host does not make, so it is rejected.
 *
 * @param {Plugin} plugin
 * @returns {PhaseStage}
 */
export declare function pluginStage(plugin: Plugin): PhaseStage;
/**
 * A descriptor for an entry whose plugin still runs as a PostCSS plugin. It is
 * the bridge for a stage that is not yet a reducer, and is replaced once it is.
 *
 * @param {import('postcss').PluginCreator<any>} creator
 * @returns {StageDescriptor}
 */
export declare function pluginStageDescriptor(creator: import('postcss').PluginCreator<any>): StageDescriptor;
//# sourceMappingURL=host.d.ts.map