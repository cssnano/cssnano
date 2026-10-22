import { ValueBuffer } from '../values/valueBuffer.js';
import { sourceValue } from '../utils/declValue.js';

/** @import {PhaseStage, Reducer, ValueStage} from './host.js' */

/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property, and writes the result only when it changed. A value
 * that reports a warning is not memoised, so each declaration reports it.
 *
 * @param {readonly ValueStage[]} stages in pipeline order
 * @returns {PhaseStage}
 */
export function declarationTraversal(stages) {
  return {
    run(root, helpers) {
      /** @type {Map<string, readonly Reducer[] | null>} */
      const plans = new Map();
      /**
       * One memo per property: the pipeline's result for each source text.
       * It lives for this run only, so no state crosses stylesheets.
       * @type {Map<string, Map<string, string>>}
       */
      const memoByProperty = new Map();

      root.walkDecls((decl) => {
        let plan = plans.get(decl.prop);
        if (plan === undefined) {
          /** @type {Reducer[]} */
          const reducers = [];
          for (const stage of stages) {
            const reducer = stage.forProperty(decl.prop);
            if (reducer !== null) reducers.push(reducer);
          }
          plan = reducers.length > 0 ? reducers : null;
          plans.set(decl.prop, plan);
        }
        if (plan === null) return;

        let memo = memoByProperty.get(decl.prop);
        if (memo === undefined) {
          memo = new Map();
          memoByProperty.set(decl.prop, memo);
        }
        const text = sourceValue(decl);
        let result = memo.get(text);
        if (result === undefined) {
          const buffer = new ValueBuffer(text);
          for (const reducer of plan) reducer(buffer);
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
