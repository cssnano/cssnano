// One worker of the oracle mutation runner. `baseline` checks a slice of one
// suite's cases on the unmutated code; `mutant` applies one mutation and
// reruns every case. Either way it prints one JSON result on stdout.
import { readFileSync } from 'node:fs';
import { fragmentOffset, startFragmentCoverage } from './fragmentReach.js';

const [mode, suitesUrl, ...rest] = process.argv.slice(2);

/**
 * @typedef {{
 *   name: string,
 *   generate: (seed: number, count: number) => string[],
 *   run: (input: string) => string,
 *   check: (input: string, output: string) => string | undefined,
 *   checkRun?: (input: string, output: string, run: (input: string) => string | null) => string | undefined,
 * }} Suite
 * @typedef {{seed: number, index: number, input: string}} Case
 */

/**
 * @param {Suite} suite
 * @param {number[]} seeds
 * @param {number} count
 * @return {Case[]}
 */
function casesOf(suite, seeds, count) {
  return seeds.flatMap((seed) =>
    suite.generate(seed, count).map((input, index) => ({ seed, index, input }))
  );
}

/**
 * The suite's run, with a thrown error read as no output.
 *
 * @param {Suite} suite
 * @return {(input: string) => string | null}
 */
function safeRun(suite) {
  return (input) => {
    try {
      return suite.run(input);
    } catch {
      return null;
    }
  };
}

/**
 * Why the output fails the suite, or undefined when it passes.
 *
 * @param {Suite} suite
 * @param {string} input
 * @param {string | null} output
 * @param {(input: string) => string | null} run
 * @return {string | undefined}
 */
function failure(suite, input, output, run) {
  if (output === null) return 'threw';
  return suite.check(input, output) ?? suite.checkRun?.(input, output, run);
}

/**
 * Checks cases `start` to `end` of one suite and returns their outputs.
 */
async function baseline() {
  const [suiteIndex, start, end, seeds, count] = rest;
  const { suites } = await import(suitesUrl);
  /** @type {Suite} */
  const suite = suites[Number(suiteIndex)];
  const run = safeRun(suite);
  const cases = casesOf(suite, seeds.split(',').map(Number), Number(count));
  const outputs = [];
  for (const { seed, index, input } of cases.slice(
    Number(start),
    Number(end)
  )) {
    const output = run(input);
    const reason = failure(suite, input, output, run);
    if (reason) {
      return { failure: `${suite.name} case ${seed}:${index}: ${reason}` };
    }
    outputs.push(output);
  }
  return { outputs };
}

/**
 * Reruns every case on the mutated code. A case whose output equals the
 * baseline's passes the output check unseen, because the check reads only
 * the input and the output; the second-pass check still runs. Each suite
 * counts the cases that executed the mutated code and the cases whose
 * output changed, so that a corpus that never exercises the mutant is not
 * mistaken for an oracle that misses it.
 */
async function mutant() {
  const [baselinePath, full] = rest;
  // Started with --import of the shared hook, which applies the mutation.
  const { wasReached } = await import('./mutation-loader.js');
  const target = /** @type {string} */ (process.env.CSSNANO_MUTATION_TARGET);
  const executions = startFragmentCoverage(target);
  const { suites } = await import(suitesUrl);
  // The hook reports an unreached target on exit; skip the cases it would run.
  if (!wasReached()) process.exit(0);
  // The hook has applied the mutation, so its fragment is known to exist.
  const offset = fragmentOffset(
    readFileSync(new URL(target), 'utf8'),
    JSON.parse(/** @type {string} */ (process.env.CSSNANO_MUTATION))
  );
  const executed = () => executions(offset);
  const recorded = JSON.parse(readFileSync(baselinePath, 'utf8'));
  return {
    suites: suites.map((/** @type {Suite} */ suite, i) => {
      const { seeds, count, inputs, outputs } = recorded[i];
      const run = safeRun(suite);
      let first = '-';
      let caught = 0;
      let reached = 0;
      let changed = 0;
      let checks = 0;
      const cases = casesOf(suite, seeds, count);
      // The skip is sound only for the very inputs the baseline checked.
      if (cases.some(({ input }, position) => input !== inputs[position])) {
        throw new Error(`${suite.name} generates different cases per run`);
      }
      // Generating the cases may run the target; only the runs count.
      executed();
      for (const [position, { seed, index, input }] of cases.entries()) {
        const output = run(input);
        const same = output === outputs[position];
        if (!same) changed += 1;
        const unchanged = full !== 'full' && same;
        if (!unchanged) checks += 1;
        const reason = unchanged
          ? suite.checkRun?.(input, /** @type {string} */ (output), run)
          : failure(suite, input, output, run);
        if (executed() > 0) reached += 1;
        if (!reason) continue;
        caught += 1;
        if (first === '-') first = `${seed}:${index}`;
      }
      return {
        name: suite.name,
        first,
        caught,
        total: cases.length,
        reached,
        changed,
        checks,
      };
    }),
  };
}

const result = await (mode === 'baseline' ? baseline() : mutant());
process.stdout.write(JSON.stringify(result));
