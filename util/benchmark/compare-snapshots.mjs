import {
  clusteredTwoSampleBootstrapConfidenceInterval,
  twoSampleBootstrapConfidenceInterval,
  percentChange,
  quantile,
} from './bench-stats.mjs';
import { MIN_USEFUL_SAMPLE_MS } from './bench-snapshots.mjs';
import {
  frameworkByName,
  validateMatchingMetadata,
} from './compare-validation.mjs';

function verdictFor(
  interval,
  medianDeltaPct,
  base,
  candidate,
  legacy,
  usefulSignal
) {
  if (
    legacy ||
    base.runs.length < 3 ||
    candidate.runs.length < 3 ||
    base.reliability !== 'reliable' ||
    candidate.reliability !== 'reliable' ||
    !usefulSignal
  ) {
    return 'inconclusive';
  }
  if (interval.high < 0 && medianDeltaPct < 0) {
    return 'improvement';
  }
  if (interval.low > 0 && medianDeltaPct > 0) {
    return 'regression';
  }
  return 'inconclusive';
}

function sampleGroupsForRuns(runs, sampleForRun, summaryForRun) {
  return runs.map((run) => {
    const samples = sampleForRun(run);
    return Array.isArray(samples) && samples.length
      ? samples
      : [summaryForRun(run)];
  });
}

function compareValues(
  baseRuns,
  candidateRuns,
  sampleForRun,
  summaryForRun,
  base,
  candidate
) {
  const baseGroups = sampleGroupsForRuns(baseRuns, sampleForRun, summaryForRun);
  const candidateGroups = sampleGroupsForRuns(
    candidateRuns,
    sampleForRun,
    summaryForRun
  );
  const baseValues = baseGroups.flat();
  const candidateValues = candidateGroups.flat();
  const baseMedian = quantile(
    baseValues.toSorted((a, b) => a - b),
    0.5
  );
  const candidateMedian = quantile(
    candidateValues.toSorted((a, b) => a - b),
    0.5
  );
  const medianDeltaPct = percentChange(baseMedian, candidateMedian);
  const interval = clusteredTwoSampleBootstrapConfidenceInterval(
    baseGroups,
    candidateGroups
  );
  const usefulSignal =
    baseMedian >= MIN_USEFUL_SAMPLE_MS &&
    candidateMedian >= MIN_USEFUL_SAMPLE_MS;
  return {
    baseMedianMs: baseMedian,
    candidateMedianMs: candidateMedian,
    medianDeltaPct,
    confidenceIntervalPct: interval,
    replicateCount: baseRuns.length,
    baseReplicateCount: baseRuns.length,
    candidateReplicateCount: candidateRuns.length,
    baseSampleCount: baseValues.length,
    candidateSampleCount: candidateValues.length,
    spreadPct: interval.high - interval.low,
    verdict: verdictFor(
      interval,
      medianDeltaPct,
      base,
      candidate,
      base.legacy || candidate.legacy,
      usefulSignal
    ),
  };
}

function compareMaxRSS(baseRuns, candidateRuns) {
  if (
    [...baseRuns.values(), ...candidateRuns.values()].some(
      (run) => !Number.isFinite(run.resourceUsage?.maxRSS)
    )
  ) {
    return null;
  }
  const baseValues = [...baseRuns.values()].map(
    (run) => run.resourceUsage.maxRSS
  );
  const candidateValues = [...candidateRuns.values()].map(
    (run) => run.resourceUsage.maxRSS
  );
  const baseMedian = quantile(
    baseValues.toSorted((a, b) => a - b),
    0.5
  );
  const candidateMedian = quantile(
    candidateValues.toSorted((a, b) => a - b),
    0.5
  );
  return {
    baseMedian,
    candidateMedian,
    medianDeltaPct: percentChange(baseMedian, candidateMedian),
    confidenceIntervalPct: twoSampleBootstrapConfidenceInterval(
      baseValues,
      candidateValues
    ),
  };
}

function comparisonWarning(base, candidate) {
  if (base.legacy || candidate.legacy) {
    return 'legacy single-run snapshot: uncertainty evidence is unavailable';
  }
  if (base.runs.length < 3 || candidate.runs.length < 3) {
    return 'fewer than three independent replicates: uncertainty evidence is weak';
  }
  if (base.reliability !== 'reliable' || candidate.reliability !== 'reliable') {
    return 'smoke or insufficient-signal benchmark: uncertainty evidence is unavailable';
  }
  return null;
}

export function analyzeIndependentSnapshots(base, candidate, options = {}) {
  const approvedOutputChanges = validateMatchingMetadata(
    base,
    candidate,
    options
  );
  const baseByName = frameworkByName(base.frameworks);
  const candidateByName = frameworkByName(candidate.frameworks);
  const names = [...baseByName.keys()];
  const missingInCandidate = names.filter((name) => !candidateByName.has(name));
  const missingInBase = [...candidateByName.keys()].filter(
    (name) => !baseByName.has(name)
  );
  if (missingInCandidate.length || missingInBase.length) {
    throw new Error(
      `incompatible snapshots: corpus entries differ (baseline-only: ${missingInCandidate.join(', ') || 'none'}; candidate-only: ${missingInBase.join(', ') || 'none'})`
    );
  }
  for (const name of names) {
    if (baseByName.get(name).bytes !== candidateByName.get(name).bytes) {
      throw new Error(
        `incompatible snapshots: byte size differs for "${name}"`
      );
    }
  }

  const baseRuns = base.runs;
  const candidateRuns = candidate.runs;
  const total = compareValues(
    baseRuns,
    candidateRuns,
    (run) => run.totalSamples,
    (run) => run.summary.total.medianMs,
    base,
    candidate
  );
  const maxRSS = compareMaxRSS(baseRuns, candidateRuns);
  const rows = names
    .map((name) => {
      const row = compareValues(
        baseRuns,
        candidateRuns,
        (run) => run.perFileSamples?.[name],
        (run) => frameworkByName(run.summary.frameworks).get(name).medianMs,
        base,
        candidate
      );
      return { name, bytes: baseByName.get(name).bytes, ...row };
    })
    .toSorted((a, b) => b.medianDeltaPct - a.medianDeltaPct);
  return {
    base,
    candidate,
    total:
      base.schemaVersion === 3 && candidate.schemaVersion === 3
        ? { endpoint: 'TOTAL', ...total }
        : total,
    maxRSS,
    rows,
    warning: comparisonWarning(base, candidate),
    approvedOutputChanges,
    analysisClass:
      base.legacy || candidate.legacy
        ? 'legacy-analysis'
        : 'independent-analysis',
    overallVerdict: 'inconclusive',
  };
}

export const compareSnapshots = analyzeIndependentSnapshots;
