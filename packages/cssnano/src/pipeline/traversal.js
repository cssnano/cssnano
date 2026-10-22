import { ValueBuffer } from '../values/valueBuffer.js';
import { ValueTable } from '../values/value.js';
import { sourceValue } from '../utils/declValue.js';

/** @import {PhaseStage, Reducer, ValueStage} from './host.js' */

/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property, and writes the result only when it changed.
 *
 * @param {readonly ValueStage[]} stages in pipeline order
 * @param {{memoise?: boolean}} [options] `memoise: false` folds every
 *   declaration, which checks that the memo only saves work
 * @returns {PhaseStage}
 */
export function declarationTraversal(stages, { memoise = true } = {}) {
  return {
    run(root) {
      const table = new ValueTable();
      /** @type {Map<string, readonly Reducer[] | null>} */
      const plans = new Map();
      /** @type {Map<string, Map<string, string>>} */
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

        let memo = memoise ? memoByProperty.get(decl.prop) : undefined;
        if (memo === undefined) {
          memo = new Map();
          if (memoise) memoByProperty.set(decl.prop, memo);
        }
        const text = sourceValue(decl);
        let result = memo.get(text);
        if (result === undefined) {
          const buffer = new ValueBuffer(table.intern(text), table);
          for (const reducer of plan) reducer(buffer);
          result = buffer.finish().text;
          memo.set(text, result);
          memo.set(result, result);
        }
        if (result !== text) {
          decl.value = result;
          delete decl.raws.value;
        }
      });
    },
  };
}
