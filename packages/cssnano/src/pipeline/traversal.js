import { ValueBuffer } from '../values/valueBuffer.js';
import { sourceValue } from '../utils/declValue.js';
import { contextOf } from './context.js';

/** @import {Container, Document} from 'postcss' */
/** @import {Helpers, Root} from 'postcss' */
/** @import {Reducer, Stage} from './host.js' */

/**
 * What one run knows about a property: the reducers of its plan, or null when
 * no stage treats it. For each context, a memo from source text to the plan's
 * result, since a value can read its context.
 * @typedef {{plan: readonly Reducer[] | null, memos: (Map<string, string> | undefined)[] | null}} PropertyEntry
 */

/**
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} property
 * @returns {PropertyEntry}
 */
function propertyEntry(stages, property) {
  /** @type {Reducer[]} */
  const reducers = [];
  for (const stage of stages) {
    const reducer = stage.forProperty?.(property) ?? null;
    if (reducer !== null) reducers.push(reducer);
  }
  return reducers.length > 0
    ? { plan: reducers, memos: [] }
    : { plan: null, memos: null };
}

/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property with its context, and writes the result only when it
 * changed. A value that reports a warning is not memoised, so each declaration
 * reports it.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @returns {{run: (root: Root, helpers: Helpers) => void}}
 */
export function declarationTraversal(stages) {
  return {
    run(root, helpers) {
      /**
       * One entry per property and the context of each container, which live
       * for this run only, so no state crosses stylesheets.
       * @type {Map<string, PropertyEntry>}
       */
      const entries = new Map();
      /** @type {WeakMap<Container | Document, number>} */
      const contexts = new WeakMap();

      root.walkDecls((decl) => {
        let entry = entries.get(decl.prop);
        if (entry === undefined) {
          entry = propertyEntry(stages, decl.prop);
          entries.set(decl.prop, entry);
        }
        const { plan, memos } = entry;
        if (plan === null || memos === null) return;

        const context = contextOf(
          /** @type {Container} */ (decl.parent),
          contexts
        );
        let memo = memos[context];
        if (memo === undefined) {
          memo = new Map();
          memos[context] = memo;
        }
        const text = sourceValue(decl);
        let result = memo.get(text);
        if (result === undefined) {
          const buffer = new ValueBuffer(text);
          for (const reducer of plan) reducer(buffer, context);
          result = buffer.finish();
          const warnings = buffer.warnings();
          if (warnings === undefined) {
            memo.set(text, result);
          } else {
            for (const { message, plugin } of warnings) {
              helpers.result.warn(
                message,
                plugin ? { plugin, node: decl } : { node: decl }
              );
            }
          }
        }
        if (result !== text) {
          decl.value = result;
          delete decl.raws.value;
        }
      });
    },
  };
}
