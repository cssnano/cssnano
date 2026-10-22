import { declarationTraversal } from './traversal.js';

/**
 * A host plugin runs the stages of one run in order, at OnceExit, so the
 * plugins before it have finished. Each run of adjacent value stages is one
 * walk over the declarations.
 */

/** @import {Helpers, Plugin, Result, Root} from 'postcss' */
/** @import {ValueBuffer} from '../values/valueBuffer.js' */

/**
 * Changes the buffer of one declaration. A reducer never sees a node.
 * @typedef {(buffer: ValueBuffer) => void} Reducer
 */

/**
 * A stage that changes declaration values. It gives the reducer of each
 * property it treats, or null for a property it leaves alone.
 * @typedef {object} ValueStage
 * @property {(property: string) => Reducer | null} forProperty
 */

/**
 * A stage that changes the stylesheet as a whole.
 * @typedef {object} PhaseStage
 * @property {(root: Root, helpers: Helpers) => void} run
 */

/** @typedef {ValueStage | PhaseStage} Stage */

/**
 * A stage descriptor builds the stage for the options of its preset entry and
 * the result being processed, or returns null when the stage does nothing.
 * @typedef {object} StageDescriptor
 * @property {(options: Record<PropertyKey, unknown>, result: Result) => Stage | null} build
 */

/**
 * One stage of a run: its descriptor and the options it is built with.
 * @typedef {{descriptor: StageDescriptor, options: Record<PropertyKey, unknown>}} StageMember
 */

/**
 * Groups the stages of a run into phases: each run of adjacent value stages
 * becomes one traversal, and a phase stage stays as it is.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @returns {PhaseStage[]}
 */
function phasesOf(stages) {
  /** @type {PhaseStage[]} */
  const phases = [];
  /** @type {ValueStage[]} */
  let values = [];
  for (const stage of stages) {
    if ('forProperty' in stage) {
      values.push(stage);
      continue;
    }
    if (values.length > 0) phases.push(declarationTraversal(values));
    values = [];
    phases.push(stage);
  }
  if (values.length > 0) phases.push(declarationTraversal(values));
  return phases;
}

/**
 * @param {readonly StageMember[]} members the stages of one run, in order
 * @returns {Plugin}
 */
export function hostPlugin(members) {
  return {
    postcssPlugin: 'cssnano-host',
    prepare(result) {
      /** @type {Stage[]} */
      const stages = [];
      for (const { descriptor, options } of members) {
        const stage = descriptor.build(options, result);
        if (stage !== null) stages.push(stage);
      }
      const phases = phasesOf(stages);
      return {
        OnceExit(root, helpers) {
          for (const phase of phases) phase.run(root, helpers);
        },
      };
    },
  };
}

/**
 * Runs a plugin that changes the stylesheet only at OnceExit, in the place of
 * the host's stage. A plugin with any other listener would need a walk that
 * the host does not make, so it is rejected.
 *
 * @param {Plugin} plugin
 * @returns {PhaseStage}
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
