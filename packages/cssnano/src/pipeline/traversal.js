import { ValueBuffer } from '../values/valueBuffer.js';
import { ValueTable } from '../values/value.js';
import { sourceValue } from '../utils/declValue.js';
import { PlanTable } from './plans.js';

/** @import {Value} from '../values/value.js' */
/** @import {PhaseStage, Reducer, ValueStage} from './host.js' */

/**
 * The results of one plan for the values it has folded in this run. A value
 * maps to its result, and a result maps to itself, because plans are idempotent.
 * @typedef {Map<Value, Value>} Memo
 */

/**
 * Folds a value through the reducers of its plan, once per run. A value that
 * the plan has already produced is returned as it is.
 *
 * @param {readonly Reducer[]} plan
 * @param {Value} value
 * @param {ValueTable} table
 * @param {Memo} memo
 * @returns {Value}
 */
function foldThrough(plan, value, table, memo) {
  const known = memo.get(value);
  if (known !== undefined) return known;
  const buffer = new ValueBuffer(value, table);
  for (const reducer of plan) reducer(buffer);
  const result = buffer.finish();
  memo.set(value, result);
  memo.set(result, result);
  return result;
}

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
      const plans = new PlanTable();
      /** @type {Map<string, readonly Reducer[] | null>} */
      const planByProperty = new Map();
      /** @type {Map<readonly Reducer[], Memo>} */
      const memoByPlan = new Map();

      root.walkDecls((decl) => {
        if (!planByProperty.has(decl.prop)) {
          /** @type {Reducer[]} */
          const reducers = [];
          for (const stage of stages) {
            const reducer = stage.forProperty(decl.prop);
            if (reducer !== null) reducers.push(reducer);
          }
          planByProperty.set(
            decl.prop,
            reducers.length > 0 ? plans.intern(reducers) : null
          );
        }
        const plan = planByProperty.get(decl.prop);
        if (plan === null || plan === undefined) return;

        let memo = memoise ? memoByPlan.get(plan) : undefined;
        if (memo === undefined) {
          memo = new Map();
          if (memoise) memoByPlan.set(plan, memo);
        }
        const value = table.intern(sourceValue(decl));
        const result = foldThrough(plan, value, table, memo);
        if (result !== value) {
          decl.value = result.text;
          delete decl.raws.value;
        }
      });
    },
  };
}
