/**
 * Building blocks shared by the differential fuzzers' `fuzzCheck.js`: running
 * a plugin, describing a failure, shrinking a failing case and reporting it.
 */

/**
 * @typedef {object} Mismatch
 * @property {string} input
 * @property {string} output the plugin's output, or the message it threw with.
 * @property {string} reason
 * @property {{slot: string, expected: string, actual: string}[]} [slots]
 */

/**
 * @param {{ process: (css: string, options: { from: undefined }) => { css: string } }} processor
 * @param {string} css
 * @return {string} the plugin's output.
 */
export function runPlugin(processor, css) {
  return processor.process(css, { from: undefined }).css;
}

/**
 * @param {string} css
 * @param {unknown} error
 * @return {Mismatch}
 */
export function threwMismatch(css, error) {
  return {
    input: css,
    output: error instanceof Error ? error.message : String(error),
    reason: 'the plugin threw',
  };
}

/**
 * Greedy one-at-a-time reduction, last item first: an item is dropped when the
 * failure persists without it. Linear in the number of items.
 *
 * @template T
 * @param {T[]} items
 * @param {(candidate: T[]) => boolean} fails
 * @return {T[]} a non-empty sublist that still fails
 */
export function shrinkList(items, fails) {
  let kept = items;

  for (let i = kept.length - 1; i >= 0; i--) {
    const candidate = kept.filter((_, index) => index !== i);

    if (candidate.length > 0 && fails(candidate)) {
      kept = candidate;
    }
  }

  return kept;
}

/**
 * @param {string} css
 * @param {(css: string) => Mismatch | undefined} check
 * @param {(css: string, fails: (candidate: string) => boolean) => string} shrink
 * @return {Mismatch | undefined} the failure of the smallest case that still
 * fails, or undefined when the case passes.
 */
export function minimise(css, check, shrink) {
  if (check(css) === undefined) {
    return undefined;
  }

  return check(shrink(css, (candidate) => check(candidate) !== undefined));
}

/**
 * @param {Mismatch} failure
 * @param {number} seed
 * @return {string}
 */
export function report(failure, seed) {
  const lines = [
    `seed ${seed}: ${failure.reason}`,
    `  in:  ${failure.input}`,
    `  out: ${failure.output}`,
  ];

  for (const { slot, expected, actual } of failure.slots ?? []) {
    lines.push(`  ${slot}: expected ${expected}, got ${actual}`);
  }

  return lines.join('\n');
}
