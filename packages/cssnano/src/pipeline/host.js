import { browserTargets, resolveTargets } from '#utils/browser-targets';
import { walkStylesheet } from './traversal.js';
import { TextTable } from '../values/textTable.js';
import { walkAfterMerge } from './afterMerge.js';

/**
 * A host plugin runs the stages of one run in order, at OnceExit, so the
 * plugins before it have finished. The stylesheet is walked once.
 */

/** @import {Plugin} from 'postcss' */
/** @import {ValueBuffer} from '../values/valueBuffer.js' */

/**
 * Changes the buffer of one declaration. A reducer never sees a node; the
 * context is the bits of `context.js` for where the declaration sits.
 * @typedef {(buffer: ValueBuffer, context: number) => void} Reducer
 */

/**
 * Reports a problem with the text being reduced. The walk turns each report
 * into a warning on the node, tagged with the plugin name when given.
 * @typedef {(message: string, plugin?: string) => void} Warn
 */

/**
 * Rewrites the text of an at-rule prelude, which has no buffer. The context
 * is the bits of `context.js` for the node.
 * @typedef {(text: string, context: number, warn: Warn) => string} TextReducer
 */

/**
 * A rewrite of an at-rule prelude. `tightensAfterName` lets the walk strip the
 * space after the name once the stage has run on a non-empty prelude that
 * starts with a parenthesis, as CSS needs no space there. Only minifyParams sets
 * it, for `@media` and `@supports`.
 * @typedef {TextReducer | {reduce: TextReducer, tightensAfterName: true}} AtRulePart
 */

/**
 * A stage changes declaration values, through `forProperty`, which gives the
 * reducer of each property it treats, or null for a property it leaves alone.
 * It rewrites at-rule preludes through `forAtRule`, and selectors through
 * `selector`, in the same walk. A selector reducer edits the buffer of the
 * selector, as a value reducer edits its declaration's. `comments` gives the
 * predicate that removes comments for one stylesheet; it is called once per
 * stylesheet, and only one stage of a run has it.
 * @typedef {object} Stage
 * @property {(property: string) => Reducer | null} [forProperty]
 * @property {(name: string) => AtRulePart | null} [forAtRule]
 * @property {Reducer} [selector]
 * @property {() => (comment: string) => boolean} [comments]
 */

/**
 * The entry of a stage in a preset. `create` builds the stage from the options
 * of the entry and, when the entry reads them, the browser targets. It returns
 * null when the stage would do nothing.
 * @typedef {object} StageEntry
 * @property {(options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => Stage | null} create
 */

/**
 * A pass that runs over the stylesheet after the walk, with the browsers of the
 * run, the options of its entry and the result for its messages. `targets` is
 * set when the pass reads the browser targets; otherwise it gets none.
 * @typedef {{pass: (css: import('postcss').Root, browsers: readonly string[], options: Record<PropertyKey, unknown>, result: import('postcss').Result) => void, options: Record<PropertyKey, unknown>, targets: boolean}} PassRun
 */

/**
 * A whole-stylesheet transform that the walk runs. `create` gets the options of
 * the entry and returns the options the walk runs the transform with, or null
 * when the transform is off.
 * @typedef {object} TransformEntry
 * @property {(options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown> | null} create
 */

/**
 * An advanced transform, which edits the symbol lists that the walk after
 * merge collected, with the options its entry's `create` returned. `remove`
 * removes a node and, with discardEmpty on, each ancestor it empties.
 * @typedef {(lists: import('./symbolLists.js').SymbolLists, options: Record<PropertyKey, unknown>, remove: (node: import('postcss').ChildNode) => void) => void} SymbolTransform
 */

/**
 * One stage entry of a host, with the options it is built with. `targets` is
 * set when the entry reads the browser targets.
 * @typedef {{entry: StageEntry, options: Record<PropertyKey, unknown>, targets: boolean}} HostMember
 */

/**
 * The browser targets of a member or pass, resolved once for each browserTargets
 * object that a file's members share.
 * @param {Map<unknown, readonly string[]>} resolutions the targets resolved so far for one file
 * @param {Record<PropertyKey, unknown>} options
 * @param {import('postcss').Result} result
 * @returns {readonly string[]}
 */
function targetsOf(resolutions, options, result) {
  const key = options[browserTargets];
  let targets = resolutions.get(key);
  if (targets === undefined) {
    targets = resolveTargets(options, result);
    resolutions.set(key, targets);
  }
  return targets;
}

/** Stands for the targets of a stage that does not read them. */
const noTargets = /** @type {readonly string[]} */ (Object.freeze([]));

/**
 * @param {readonly HostMember[]} members the stages of one run, in order
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} [transforms] the options of the
 *   whole-stylesheet transforms that the walk runs, by entry name; a missing name is disabled
 * @param {ReadonlyMap<string, PassRun>} [passes] the passes that run after the walk, by entry name
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} [after] the options of the transforms that
 *   the walk after the passes runs, by entry name; a missing name is disabled
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} [symbols]
 *   the advanced transforms that run over the lists of the walk after the passes, in order
 * @returns {Plugin}
 */
export function hostPlugin(
  members,
  transforms = new Map(),
  passes = new Map(),
  after = new Map(),
  symbols = new Map()
) {
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
      // Members that share one browserTargets object share one resolution per file.
      /** @type {Map<unknown, readonly string[]>} */
      const resolutions = new Map();
      /** @type {Stage[]} */
      const stages = [];
      for (const [index, { entry, options, targets }] of members.entries()) {
        const resolved = targets
          ? targetsOf(resolutions, options, result)
          : noTargets;
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
      const runs = [...passes.values()].map(({ pass, options, targets }) => ({
        pass,
        options,
        browsers: targets ? targetsOf(resolutions, options, result) : noTargets,
      }));
      return {
        OnceExit(root, helpers) {
          if (members.length > 0 || transforms.size > 0) {
            walkStylesheet(stages, root, helpers, transforms, new TextTable());
          }
          for (const { pass, options, browsers } of runs) {
            pass(root, browsers, options, helpers.result);
          }
          if (after.size > 0 || symbols.size > 0) {
            walkAfterMerge(root, helpers.result, after, symbols);
          }
        },
      };
    },
  };
}
