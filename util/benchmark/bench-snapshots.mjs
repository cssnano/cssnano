import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { corpusManifest, shuffleCorpus } from './bench-corpus.mjs';
import {
  environmentMetadata,
  resourceMetadata,
  runMeasuredCorpus,
} from './bench-runner.mjs';
import { fmtMs, quantile, summaryStatistics } from './bench-stats.mjs';
import { benchmarkCases } from './bench-cases.mjs';

export const SNAPSHOT_VERSION = 2;
export const MIN_USEFUL_SAMPLE_MS = 5;

function frameworkSummary(name, bytes, samples, outputHash) {
  const summary = summaryStatistics(samples);
  return {
    name,
    bytes,
    ...summary,
    kbPerSec: bytes / 1024 / (summary.medianMs / 1000),
    outputHash,
  };
}

function runSummary(corpus, measured) {
  return {
    total: summaryStatistics(measured.totalSamples),
    frameworks: corpus.map(({ name, source }) =>
      frameworkSummary(
        name,
        source.length,
        measured.perFileSamples[name],
        measured.outputHashes[name]
      )
    ),
  };
}

function reliabilityFor(summary, args) {
  if (args.mode === 'quick') return 'smoke';
  return summary.total.medianMs >= MIN_USEFUL_SAMPLE_MS
    ? 'reliable'
    : 'insufficient-signal';
}

export async function runOnce(
  args,
  corpus,
  processor,
  snapshotLabel,
  replicateIndex
) {
  if (args.revision === null) {
    console.warn('warning: quick benchmark has no explicit revision metadata');
  }
  const orderedCorpus = shuffleCorpus(corpus, args.seed, replicateIndex);
  const target = args.case ? benchmarkCases[args.case].plugin : 'cssnano';
  const profilePath = args.profile
    ? join(args.resultsDir, `${snapshotLabel}.cpuprofile`)
    : null;
  mkdirSync(args.resultsDir, { recursive: true });

  const measured = await runMeasuredCorpus(
    orderedCorpus,
    processor,
    args,
    profilePath
  );
  const summary = runSummary(corpus, measured);
  const reliability = reliabilityFor(summary, args);
  const run = {
    index: replicateIndex,
    seed: args.seed,
    executionOrder: orderedCorpus.map(({ name }) => name),
    totalSamples: measured.totalSamples,
    perFileSamples: measured.perFileSamples,
    outputHashes: measured.outputHashes,
    summary,
    reliability,
    resourceUsage: resourceMetadata(),
  };

  if (!args.summary) {
    console.log(
      `cssnano ${target} benchmark — preset=${args.preset}, ` +
        `NODE_ENV=${process.env.NODE_ENV}, node ${process.version}`
    );
    console.log(
      `reliability=${reliability}, mode=${args.mode}, corpus=${corpus.length} files, ` +
        `warmup=${args.warmup}, samples=${args.iters}, run=${replicateIndex}`
    );
    console.log();
    console.log(
      'framework'.padEnd(28) +
        'size'.padStart(10) +
        'median'.padStart(12) +
        'min'.padStart(12) +
        'p95'.padStart(12) +
        'kB/s'.padStart(10)
    );
    console.log('-'.repeat(84));
    for (const entry of summary.frameworks) {
      console.log(
        entry.name.padEnd(28) +
          (entry.bytes / 1024).toFixed(1).padStart(8) +
          ' k' +
          fmtMs(entry.medianMs).padStart(12) +
          fmtMs(entry.minMs).padStart(12) +
          fmtMs(entry.p95Ms).padStart(12) +
          entry.kbPerSec.toFixed(0).padStart(10)
      );
    }
    console.log('-'.repeat(84));
    const totalBytes = corpus.reduce(
      (total, file) => total + file.source.length,
      0
    );
    console.log(
      'TOTAL'.padEnd(28) +
        (totalBytes / 1024).toFixed(1).padStart(8) +
        ' k' +
        fmtMs(summary.total.medianMs).padStart(12) +
        fmtMs(summary.total.minMs).padStart(12) +
        fmtMs(summary.total.p95Ms).padStart(12)
    );
  } else {
    console.log(
      `run ${replicateIndex}: total ${fmtMs(summary.total.medianMs).trim()}`
    );
  }
  if (reliability === 'insufficient-signal') {
    console.warn(
      `warning: measured corpus pass is only ${summary.total.medianMs.toFixed(2)} ms; ` +
        'comparisons will be treated as inconclusive'
    );
  }
  if (profilePath) console.log(`wrote ${profilePath}`);
  const environment = environmentMetadata();
  return {
    schemaVersion: SNAPSHOT_VERSION,
    label: snapshotLabel,
    preset: args.preset,
    target,
    corpusManifest: corpusManifest(corpus),
    corpus: corpus
      .map(({ name, source }) => ({ name, bytes: source.length }))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
    gitRevision: args.revision,
    environment,
    finalizationMode: environment.finalizationMode,
    timestamp: new Date().toISOString(),
    arguments: process.argv.slice(2),
    configuration: {
      mode: args.mode,
      warmup: args.warmup,
      iters: args.iters,
      runs: args.runs,
      seed: args.seed,
      reliability: args.mode === 'quick' ? 'smoke' : 'reliable',
    },
    seed: args.seed,
    warmup: args.warmup,
    iters: args.iters,
    mode: args.mode,
    reliability,
    runs: [run],
    total: {
      bytes: corpus.reduce((total, file) => total + file.source.length, 0),
      medianMs: summary.total.medianMs,
      minMs: summary.total.minMs,
      meanMs: summary.total.meanMs,
      p95Ms: summary.total.p95Ms,
      maxMs: summary.total.maxMs,
      kbPerSec:
        corpus.reduce((total, file) => total + file.source.length, 0) /
        1024 /
        (summary.total.medianMs / 1000),
    },
    frameworks: summary.frameworks,
    outputHashes: measured.outputHashes,
  };
}

export function aggregateSnapshots(snapshots, label, args) {
  const first = snapshots[0];
  for (const snapshot of snapshots.slice(1)) {
    if (snapshot.gitRevision !== first.gitRevision) {
      throw new Error('revision changed between benchmark runs');
    }
    if (snapshot.corpusManifest !== first.corpusManifest) {
      throw new Error('corpus changed between benchmark runs');
    }
    for (const name of Object.keys(first.outputHashes)) {
      if (snapshot.outputHashes[name] !== first.outputHashes[name]) {
        throw new Error(`output changed between benchmark runs for ${name}`);
      }
    }
  }

  const totalSummary = summaryStatistics(
    snapshots.map((snapshot) => snapshot.total.medianMs)
  );
  const frameworks = first.frameworks.map((entry) => {
    const values = (field) =>
      snapshots
        .map(
          (snapshot) =>
            snapshot.frameworks.find(
              (candidate) => candidate.name === entry.name
            )[field]
        )
        .toSorted((a, b) => a - b);
    return {
      ...entry,
      minMs: quantile(values('minMs'), 0.5),
      medianMs: quantile(values('medianMs'), 0.5),
      meanMs: quantile(values('meanMs'), 0.5),
      p95Ms: quantile(values('p95Ms'), 0.5),
      maxMs: quantile(values('maxMs'), 0.5),
      kbPerSec: quantile(values('kbPerSec'), 0.5),
    };
  });
  const aggregate = {
    ...first,
    label,
    timestamp: new Date().toISOString(),
    configuration: { ...first.configuration, runs: args.runs },
    runs: snapshots.flatMap((snapshot) => snapshot.runs),
    reliability: snapshots.some(
      (snapshot) => snapshot.reliability === 'insufficient-signal'
    )
      ? 'insufficient-signal'
      : first.reliability,
    total: {
      ...first.total,
      medianMs: totalSummary.medianMs,
      minMs: totalSummary.minMs,
      meanMs: totalSummary.meanMs,
      p95Ms: totalSummary.p95Ms,
      maxMs: totalSummary.maxMs,
      kbPerSec: first.total.bytes / 1024 / (totalSummary.medianMs / 1000),
    },
    frameworks,
  };
  writeFileSync(
    join(args.resultsDir, `${label}.json`),
    JSON.stringify(aggregate, null, 2)
  );
  console.log(
    `median of ${snapshots.length} runs: ${fmtMs(totalSummary.medianMs).trim()}`
  );
  console.log(`wrote ${join(args.resultsDir, `${label}.json`)}`);
  return aggregate;
}
