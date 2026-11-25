// Exact call counts from V8 precise coverage, so work-count tests and scripts
// read how often a function ran without patching the code they measure.

/**
 * The calls of every function named `functionName` in the scripts whose url
 * ends with `module`. A function's first range spans its body, and its count
 * is the calls.
 *
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @param {string} module
 * @param {string} functionName
 * @return {number}
 */
export function callCount(coverage, module, functionName) {
  let calls = 0;
  for (const script of coverage) {
    if (!script.url.endsWith(module)) continue;
    for (const fn of script.functions) {
      if (fn.functionName === functionName) calls += fn.ranges[0].count;
    }
  }
  return calls;
}
