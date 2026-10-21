// Whether a mutant's changed code actually ran. A mutant whose module loads
// but whose mutated code never executes cannot be caught by any oracle, so
// its survival says nothing about the oracle; V8 block coverage tells the two
// apart case by case.
import { Session } from 'node:inspector';
import { applyMutation } from './mutation-testing.js';

/**
 * @typedef {{startOffset: number, endOffset: number, count: number}} CoverageRange
 * @typedef {{ranges: CoverageRange[]}} FunctionCoverage
 */

/**
 * The offset in the mutated source of the first character the mutation
 * wrote, or of the code that follows a deletion, skipping whitespace.
 *
 * @param {string} source the unmutated source
 * @param {{find: string, replace: string}} mutation
 * @return {number}
 */
export function fragmentOffset(source, mutation) {
  const mutated = applyMutation(source, mutation);
  const start = source.indexOf(mutation.find);
  const code = mutated.slice(start).search(/\S/v);
  return code === -1 ? start : start + code;
}

/**
 * How often the code at `offset` executed: the count of the innermost block
 * that contains it, or 0 when no block does.
 *
 * @param {FunctionCoverage[]} functions
 * @param {number} offset
 * @return {number}
 */
export function executionCount(functions, offset) {
  let count = 0;
  let width = Infinity;
  for (const { ranges } of functions) {
    for (const { startOffset, endOffset, count: hits } of ranges) {
      if (startOffset <= offset && offset < endOffset) {
        if (endOffset - startOffset < width) {
          width = endOffset - startOffset;
          count = hits;
        }
      }
    }
  }
  return count;
}

/**
 * Starts precise block coverage. Call it before the target module loads. The
 * returned function reports how often the code at an offset in the script at
 * `url` executed since the previous call.
 *
 * @param {string} url
 * @return {(offset: number) => number}
 */
export function startFragmentCoverage(url) {
  const session = new Session();
  session.connect();
  /**
   * The inspector answers a same-thread request before `post` returns.
   *
   * @param {string} method
   * @param {object} [params]
   * @return {any}
   */
  const post = (method, params) => {
    let result;
    session.post(method, params, (error, value) => {
      if (error) throw error;
      result = value;
    });
    return result;
  };
  post('Profiler.enable');
  post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  return (offset) => {
    // A script that did not run since the last take is left out of it.
    const script = post('Profiler.takePreciseCoverage').result.find(
      (/** @type {{url: string}} */ entry) => entry.url === url
    );
    return script ? executionCount(script.functions, offset) : 0;
  };
}
