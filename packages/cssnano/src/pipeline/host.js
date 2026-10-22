/**
 * A stage changes the stylesheet once per run. A host plugin runs the stages
 * of a run in order, at OnceExit, so the plugins before it have finished.
 */

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
export function hostPlugin(stages) {
  return {
    postcssPlugin: 'cssnano-host',
    OnceExit(root, helpers) {
      for (const stage of stages) stage.run(root, helpers);
    },
  };
}

/**
 * Runs a plugin that changes the stylesheet only at OnceExit, in the place of
 * the host's stage. A plugin with any other listener would need a walk that
 * the host does not make, so it is rejected.
 *
 * @param {Plugin} plugin
 * @returns {Stage}
 */
export function pluginStage(plugin) {
  return {
    run(root, helpers) {
      const listeners = plugin.prepare
        ? plugin.prepare(helpers.result)
        : plugin;
      for (const event of Object.keys(listeners)) {
        if (event !== 'postcssPlugin' && event !== 'OnceExit') {
          throw new Error(
            `${plugin.postcssPlugin} has a ${event} listener, which a host plugin cannot run.`
          );
        }
      }
      listeners.OnceExit?.(root, helpers);
    },
  };
}

/**
 * A descriptor for an entry whose plugin still runs as a PostCSS plugin. It is
 * the bridge for a stage that is not yet a reducer, and is replaced once it is.
 *
 * @param {import('postcss').PluginCreator<any>} creator
 * @returns {StageDescriptor}
 */
export function pluginStageDescriptor(creator) {
  return {
    build: (options) => pluginStage(/** @type {Plugin} */ (creator(options))),
  };
}
