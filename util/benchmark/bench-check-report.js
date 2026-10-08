// Pure summary and output formatting for bench-check, kept free of process
// spawning so it can be tested without worktrees.

import { formatSeconds } from './bench-defaults.js';

export function summaryFor(caseName, result) {
  const { total } = result;
  if (!total) {
    return {
      case: caseName,
      verdict: 'unavailable',
      blocks: result.blocks?.length ?? 0,
    };
  }
  const { low, high } = total.confidenceIntervalPct;
  return {
    case: caseName,
    verdict: result.overallVerdict,
    direction: total.statisticalDirection,
    practical: total.practicalConclusion,
    ratio: total.ratio,
    intervalPct: [low, high],
    blocks: result.blocks.length,
    ...(result.verdictBasis && { basis: result.verdictBasis }),
    ...(result.inconclusiveReason && { reason: result.inconclusiveReason }),
    // A report exists only after preflight found equal output hashes.
    outputs: 'identical',
  };
}

// Only a statistical direction counts as a finding; an inconclusive case
// with a ratio near 1 means no large change.
export function classifyOverall(summaries) {
  const names = (predicate) =>
    summaries.filter(predicate).map((summary) => summary.case);
  const regressions = names((summary) => summary.direction === 'slower');
  const improvements = names((summary) => summary.direction === 'faster');
  const incomplete = names((summary) => !summary.ratio);
  const parts = [
    regressions.length && `possible regression: ${regressions.join(', ')}`,
    improvements.length && `possible improvement: ${improvements.join(', ')}`,
    incomplete.length && `incomplete: ${incomplete.join(', ')}`,
  ].filter(Boolean);
  return {
    regressions,
    improvements,
    line: parts.length ? parts.join('; ') : 'no change detected',
  };
}

export function followUpCommands(summaries, args) {
  const { regressions, improvements } = classifyOverall(summaries);
  const flagged = [...regressions, ...improvements];
  if (!flagged.length) return [];
  const revisions = [
    args.base && `--base=${args.base}`,
    args.candidate && `--candidate=${args.candidate}`,
  ].filter(Boolean);
  const candidate =
    args.candidate && args.candidate !== 'worktree'
      ? args.candidate
      : '<commit>';
  return [
    [
      'pnpm run bench:check',
      `--case=${flagged.join(',')}`,
      ...revisions,
      `--budget=${args.budget ?? '2m'}`,
    ].join(' '),
    ...flagged.map(
      (name) =>
        `node util/benchmark/compare-revisions.js --base-revision=${args.base ?? 'HEAD'} --candidate-revision=${candidate} --base-dir=<worktree> --candidate-dir=<worktree> --results-dir=<path> --case=${name}`
    ),
  ];
}

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 && seconds % 60 === 0
    ? `${seconds / 60}m`
    : formatSeconds(ms);
}

export function formatHeader(caseCount, budgetMs) {
  return `${caseCount} ${caseCount === 1 ? 'case' : 'cases'}, ${formatDuration(budgetMs)} total, ≈${formatDuration(budgetMs / caseCount)} each`;
}

export function progressLine(index, total, name, elapsedMs, budgetMs) {
  return `bench-check: [${index}/${total}] ${name} done after ${formatSeconds(elapsedMs)}; ${formatSeconds(Math.max(0, budgetMs - elapsedMs))} of budget left`;
}

const signed = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;

export function formatTable(summaries) {
  const rows = summaries.map((summary) => [
    summary.case,
    summary.ratio === undefined ? '-' : summary.ratio.toFixed(3),
    summary.intervalPct
      ? `[${signed(summary.intervalPct[0])}, ${signed(summary.intervalPct[1])}]%`
      : '-',
    summary.direction
      ? `${summary.verdict}/${summary.direction}`
      : summary.verdict,
    summary.reason ??
      (summary.exitStatus === undefined ? '' : `exit ${summary.exitStatus}`),
  ]);
  rows.unshift(['case', 'ratio', 'interval', 'verdict', 'reason']);
  const widths = [0, 1, 2, 3].map((column) =>
    Math.max(...rows.map((row) => row[column].length))
  );
  return rows
    .map((row) =>
      row
        .map((cell, column) =>
          column < 4 ? cell.padEnd(widths[column]) : cell
        )
        .join('  ')
        .trimEnd()
    )
    .join('\n');
}
