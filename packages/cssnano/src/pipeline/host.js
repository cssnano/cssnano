import { resolveTargets } from '#utils/browser-targets';
import { declarationTraversal } from './traversal.js';

/**
 * A host plugin runs the stages of one run in order, at OnceExit, so the
 * plugins before it have finished. Each run of adjacent value stages is one
 * walk over the declarations.
 */

/** @import {Helpers, Plugin, Result, Root} from 'postcss' */
/** @import {ValueBuffer} from '../values/valueBuffer.js' */

/**
 * Changes the buffer of one declaration. A reducer never sees a node; the
 * context is the bits of `context.js` for where the declaration sits.
 * @typedef {(buffer: ValueBuffer, context: number) => void} Reducer
 */

/**
 * A stage that changes declaration values. It gives the reducer of each
 * property it treats, or null for a property it leaves alone. A stage may
 * also change at-rule or selector text, in `run`, which runs once the walk of
 * its run has finished.
 * @typedef {object} ValueStage
 * @property {(property: string) => Reducer | null} forProperty
 * @property {(root: Root, helpers: Helpers) => void} [run]
 */

/**
 * A stage that changes the stylesheet as a whole.
 * @typedef {object} PhaseStage
 * @property {(root: Root, helpers: Helpers) => void} run
 */

/** @typedef {ValueStage | PhaseStage} Stage */

/**
 * A stage descriptor starts the stage of a preset entry for one stylesheet. It
 * returns a function that builds a fresh stage, so no state outlives a run, or
 * null when the stage does nothing.
 * @typedef {object} StageDescriptor
 * @property {(options: Record<PropertyKey, unknown>, result: Result) => (() => Stage) | null} start
 */

/**
 * One stage of a run: its descriptor and the options it is built with.
 * @typedef {{descriptor: StageDescriptor, options: Record<PropertyKey, unknown>}} StageMember
 */

/** Stands for the targets of a stage that does not read them. */
const noTargets = /** @type {readonly string[]} */ (Object.freeze([]));

/**
 * Makes a stage descriptor. Its `start` compiles the stage once per options
 * object and browser targets, and the memo lives in the descriptor. The frozen
 * targets of equal browserslist results are the same array, so the memo serves
 * every stylesheet.
 *
 * @param {{targets?: boolean, compile: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => (() => Stage) | null}} spec
 * @returns {StageDescriptor}
 */
export function stageDescriptor({ targets = false, compile }) {
  /** @type {WeakMap<object, WeakMap<object, (() => Stage) | null>>} */
  const byOptions = new WeakMap();
  return {
    start(options, result) {
      const resolved = targets ? resolveTargets(options, result) : noTargets;
      let byTargets = byOptions.get(options);
      if (byTargets === undefined) {
        byTargets = new WeakMap();
        byOptions.set(options, byTargets);
      }
      if (!byTargets.has(resolved)) {
        byTargets.set(
          resolved,
          compile(options, targets ? resolved : undefined)
        );
      }
      return /** @type {(() => Stage) | null} */ (byTargets.get(resolved));
    },
  };
}

/**
 * Groups the stages of a run into phases: each run of adjacent value stages
 * becomes one traversal, and a phase stage stays as it is. The `run` part of a
 * value stage follows the traversal that holds its declarations, before the
 * next phase.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @returns {PhaseStage[]}
 */
function phasesOf(stages) {
  /** @type {PhaseStage[]} */
  const phases = [];
  /** @type {ValueStage[]} */
  let values = [];
  /** @type {PhaseStage[]} */
  let afterValues = [];
  const endValues = () => {
    if (values.length > 0) phases.push(declarationTraversal(values));
    phases.push(...afterValues);
    values = [];
    afterValues = [];
  };
  for (const stage of stages) {
    if ('forProperty' in stage) {
      values.push(stage);
      if (stage.run) afterValues.push({ run: stage.run });
      continue;
    }
    endValues();
    phases.push(stage);
  }
  endValues();
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
      for (const member of members) {
        const start = member.descriptor.start(member.options, result);
        if (start !== null) stages.push(start());
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
