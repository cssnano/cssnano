/**
 * A stage changes the stylesheet once per run. A host plugin runs the stages
 * of a run in order, at OnceExit, so the plugins before it have finished.
 */
import type { Helpers, Plugin, Root } from 'postcss';
export type Stage = {
    /**
     * changes the stylesheet
     */
    run: (root: Root, helpers: Helpers) => void;
};
export type StageDescriptor = {
    build: (options: Record<PropertyKey, unknown>) => Stage | null;
};
/** @import {Helpers, Plugin, PluginCreator, Root} from 'postcss' */
/**
 * @typedef {object} Stage
 * @property {(root: Root, helpers: Helpers) => void} run changes the stylesheet
 */
/**
 * A stage descriptor builds the stage for the options of its preset entry, or
 * returns null when the stage does nothing with those options.
 *
 * @typedef {object} StageDescriptor
 * @property {(options: Record<PropertyKey, unknown>) => Stage | null} build
 */
/**
 * @param {readonly Stage[]} stages the stages of one run, in order
 * @returns {Plugin}
 */
export declare function hostPlugin(stages: readonly Stage[]): Plugin;
/**
 * Runs a plugin that changes the stylesheet only at OnceExit, in the place of
 * the host's stage. A plugin with any other listener would need a walk that
 * the host does not make, so it is rejected.
 *
 * @param {Plugin} plugin
 * @returns {Stage}
 */
export declare function pluginStage(plugin: Plugin): Stage;
/**
 * A descriptor for an entry whose plugin still runs as a PostCSS plugin. It is
 * the bridge for a stage that is not yet a reducer, and is replaced once it is.
 *
 * @param {import('postcss').PluginCreator<any>} creator
 * @returns {StageDescriptor}
 */
export declare function pluginStageDescriptor(creator: import('postcss').PluginCreator<any>): StageDescriptor;
//# sourceMappingURL=host.d.ts.map