import {
  bootstrapConfidenceInterval,
  pairedPercentChange,
  quantile,
} from './compare-statistics.mjs';
import {
  frameworkByName,
  validateMatchingMetadata,
} from './compare-validation.mjs';

function verdictFor(interval, base, candidate, legacy) {
  if (
    legacy ||
    base.runs.length < 2 ||
    candidate.runs.length < 2 ||
    base.reliability !== 'reliable' ||
    candidate.reliability !== 'reliable'
  ) {
    return 'inconclusive';
  }
  if (interval.high < 0) return 'improvement';
  if (interval.low > 0) return 'regression';
  return 'inconclusive';
}

function compareValues(baseValues, candidateValues, base, candidate) {
  const changes = baseValues.map((value, index) =>
    pairedPercentChange(value, candidateValues[index])
  );
  const interval = bootstrapConfidenceInterval(changes);
  const sorted = changes.toSorted((a, b) => a - b);
  const medianDeltaPct = quantile(sorted, 0.5);
  const spreadPct = quantile(sorted, 0.95) - quantile(sorted, 0.05);
  return {
    baseMedianMs: quantile(
      baseValues.toSorted((a, b) => a - b),
      0.5
    ),
    candidateMedianMs: quantile(
      candidateValues.toSorted((a, b) => a - b),
      0.5
    ),
    medianDeltaPct,
    medianDelta: medianDeltaPct,
    confidenceIntervalPct: interval,
    confidenceInterval: interval,
    replicateCount: changes.length,
    replicates: changes.length,
    spreadPct,
    spread: spreadPct,
    verdict: verdictFor(
      interval,
      base,
      candidate,
      base.legacy || candidate.legacy
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
  const baseValues = [...baseRuns.keys()]
    .toSorted()
    .map((index) => baseRuns.get(index).resourceUsage.maxRSS);
  const candidateValues = [...baseRuns.keys()]
    .toSorted()
    .map((index) => candidateRuns.get(index).resourceUsage.maxRSS);
  const changes = baseValues.map((value, index) =>
    pairedPercentChange(value, candidateValues[index])
  );
  return {
    baseMedian: quantile(
      baseValues.toSorted((a, b) => a - b),
      0.5
    ),
    candidateMedian: quantile(
      candidateValues.toSorted((a, b) => a - b),
      0.5
    ),
    medianDeltaPct: quantile(
      changes.toSorted((a, b) => a - b),
      0.5
    ),
  };
}

function comparisonWarning(base, candidate) {
  if (base.legacy || candidate.legacy) {
    return 'legacy single-run snapshot: uncertainty evidence is unavailable';
  }
  if (base.runs.length < 2) {
    return 'fewer than two independent replicates: uncertainty evidence is weak';
  }
  if (base.reliability !== 'reliable' || candidate.reliability !== 'reliable') {
    return 'smoke or insufficient-signal benchmark: uncertainty evidence is unavailable';
  }
  return null;
}

export function compareSnapshots(base, candidate, options = {}) {
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

  const baseRuns = new Map(base.runs.map((run) => [run.index, run]));
  const candidateRuns = new Map(candidate.runs.map((run) => [run.index, run]));
  const pair = (read) =>
    [...baseRuns.keys()]
      .toSorted()
      .map((index) => read(baseRuns.get(index), candidateRuns.get(index)));
  const total = compareValues(
    pair((baseRun) => baseRun.summary.total.medianMs),
    pair((_, candidateRun) => candidateRun.summary.total.medianMs),
    base,
    candidate
  );
  const maxRSS = compareMaxRSS(baseRuns, candidateRuns);
  const rows = names
    .map((name) => {
      const row = compareValues(
        pair(
          (run) => frameworkByName(run.summary.frameworks).get(name).medianMs
        ),
        pair(
          (_, run) => frameworkByName(run.summary.frameworks).get(name).medianMs
        ),
        base,
        candidate
      );
      return { name, bytes: baseByName.get(name).bytes, ...row };
    })
    .toSorted((a, b) => b.medianDeltaPct - a.medianDeltaPct);
  return {
    base,
    candidate,
    total,
    maxRSS,
    rows,
    warning: comparisonWarning(base, candidate),
    approvedOutputChanges,
  };
}
