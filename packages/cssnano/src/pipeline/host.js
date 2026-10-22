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
 * Changes the buffer of one declaration. A reducer never sees a node.
 * @typedef {(buffer: ValueBuffer) => void} Reducer
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
 * A stage descriptor compiles what depends only on the options of its preset
 * entry and the browser targets. It returns a function that starts the stage
 * for one stylesheet, so no state outlives a run, or null when the stage does
 * nothing.
 * @typedef {object} StageDescriptor
 * @property {boolean} [targets] whether the stage reads the browser targets
 * @property {(options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => (() => Stage) | null} compile
 */

/**
 * One stage of a run: its descriptor and the options it is built with.
 * @typedef {{descriptor: StageDescriptor, options: Record<PropertyKey, unknown>}} StageMember
 */

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

/** Stands for the targets of a stage that does not read them. */
const noTargets = /** @type {readonly string[]} */ (Object.freeze([]));

/**
 * The compiled stages, by descriptor, options object and frozen targets. The
 * targets of equal browserslist results are the same frozen array.
 * @type {WeakMap<StageDescriptor, WeakMap<object, WeakMap<object, (() => Stage) | null>>>}
 */
const compiled = new WeakMap();

/**
 * @param {StageMember} member
 * @param {Result} result
 * @returns {(() => Stage) | null}
 */
function compileMember({ descriptor, options }, result) {
  const targets = descriptor.targets
    ? resolveTargets(options, result)
    : noTargets;
  let byOptions = compiled.get(descriptor);
  if (byOptions === undefined) {
    byOptions = new WeakMap();
    compiled.set(descriptor, byOptions);
  }
  let byTargets = byOptions.get(options);
  if (byTargets === undefined) {
    byTargets = new WeakMap();
    byOptions.set(options, byTargets);
  }
  if (!byTargets.has(targets)) {
    byTargets.set(
      targets,
      descriptor.compile(options, descriptor.targets ? targets : undefined)
    );
  }
  return /** @type {(() => Stage) | null} */ (byTargets.get(targets));
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
        const start = compileMember(member, result);
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
