// What a run prints: one row per case, and a last line that states the whole
// outcome, so a reader of that line alone knows how the run ended.

const pct = (value) => `${((value - 1) * 100).toFixed(1)}%`;

export function formatRow(result) {
  if (!result.interval) {
    return `${result.case}: ${result.verdict} (${result.reason})`;
  }
  const interval = `[${pct(result.interval.low)}, ${pct(result.interval.high)}]`;
  return `${result.case}: ${pct(result.ratio)} ${interval} ${result.verdict} (${result.reason})`;
}

// A verdict is advisory, so a regression does not fail the run: status says
// whether the harness finished.
const COUNTED_VERDICTS = [
  ['regression', 'regression'],
  ['improvement', 'improvement'],
  ['within-margin', 'no-meaningful-change'],
  ['inconclusive', 'inconclusive'],
];

/**
 * @param {{failed: boolean, results: Array<{verdict: string}>, path?: string}} run
 * @return {string}
 */
export function doneLine({ failed, results, path }) {
  const status = `bench: done status=${failed ? 'fail' : 'pass'}`;
  if (!results.length) return status;
  const counts = COUNTED_VERDICTS.map(
    ([label, verdict]) =>
      `${label}=${results.filter((result) => result.verdict === verdict).length}`
  );
  return `${status} cases=${results.length} ${counts.join(' ')}${path ? ` results=${path}` : ''}`;
}
