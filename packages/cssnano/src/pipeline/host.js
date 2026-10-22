import { resolveTargets } from '#utils/browser-targets';
import { declarationTraversal } from './traversal.js';

/**
 * A host plugin runs the stages of one run in order, at OnceExit, so the
 * plugins before it have finished. The declarations of the run are walked once,
 * then each stage runs its `run` part.
 */

/** @import {Helpers, Plugin, Root} from 'postcss' */
/** @import {ValueBuffer} from '../values/valueBuffer.js' */

/**
 * Changes the buffer of one declaration. A reducer never sees a node; the
 * context is the bits of `context.js` for where the declaration sits.
 * @typedef {(buffer: ValueBuffer, context: number) => void} Reducer
 */

/**
 * A stage changes declaration values, through `forProperty`, which gives the
 * reducer of each property it treats, or null for a property it leaves alone.
 * It may also change the stylesheet in `run`, once the walk has finished.
 * @typedef {object} Stage
 * @property {(property: string) => Reducer | null} [forProperty]
 * @property {(root: Root, helpers: Helpers) => void} [run]
 */

/**
 * The entry of a stage in a preset. `create` builds the stage from the options
 * of the entry and, when the entry reads them, the browser targets. It returns
 * null when the stage would do nothing.
 * @typedef {object} StageEntry
 * @property {(options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => Stage | null} create
 */

/**
 * One stage entry of a host, with the options it is built with. `targets` is
 * set when the entry reads the browser targets.
 * @typedef {{entry: StageEntry, options: Record<PropertyKey, unknown>, targets: boolean}} HostMember
 */

/** Stands for the targets of a stage that does not read them. */
const noTargets = /** @type {readonly string[]} */ (Object.freeze([]));

/**
 * @param {readonly HostMember[]} members the stages of one run, in order
 * @returns {Plugin}
 */
export function hostPlugin(members) {
  // Each member keeps its stage per targets array. The frozen targets of equal
  // browserslist results are one array, so the memo serves every stylesheet.
  // A member that reads no targets is created now, under noTargets.
  const memos = members.map(({ entry, options, targets }) => {
    /** @type {WeakMap<readonly string[], Stage | null>} */
    const memo = new WeakMap();
    if (!targets) memo.set(noTargets, entry.create(options, undefined));
    return memo;
  });
  return {
    postcssPlugin: 'cssnano-host',
    prepare(result) {
      /** @type {Stage[]} */
      const stages = [];
      for (const [index, { entry, options, targets }] of members.entries()) {
        const resolved = targets ? resolveTargets(options, result) : noTargets;
        const memo = /** @type {WeakMap<readonly string[], Stage | null>} */ (
          memos[index]
        );
        if (!memo.has(resolved)) {
          memo.set(
            resolved,
            entry.create(options, targets ? resolved : undefined)
          );
        }
        const stage = memo.get(resolved);
        if (stage) stages.push(stage);
      }
      const walk = declarationTraversal(stages);
      return {
        OnceExit(root, helpers) {
          walk.run(root, helpers);
          for (const stage of stages) stage.run?.(root, helpers);
        },
      };
    },
  };
}
