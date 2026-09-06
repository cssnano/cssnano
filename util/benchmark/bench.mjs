// cssnano benchmark harness.
//
// A measured sample is one complete pass over the selected corpus. Independent
// process runs are retained in the snapshot so compare-bench can estimate the
// uncertainty of a change instead of treating in-process samples as replicas.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  createBenchmarkProcessor,
  MODES,
  resolveBenchmarkArgs,
} from './bench-config.mjs';
import { processCorpus, selectCorpus, shuffleCorpus } from './bench-corpus.mjs';
import {
  aggregateSnapshots,
  runOnce,
  SNAPSHOT_VERSION,
  MIN_USEFUL_SAMPLE_MS,
} from './bench-snapshots.mjs';
import { quantile, summaryStatistics } from './bench-stats.mjs';

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'production';

const DEFAULT_DIR = join(import.meta.dirname, '..', '..', 'frameworks');

export {
  aggregateSnapshots,
  createBenchmarkProcessor,
  MIN_USEFUL_SAMPLE_MS,
  MODES,
  processCorpus,
  quantile,
  resolveBenchmarkArgs,
  runOnce,
  selectCorpus,
  shuffleCorpus,
  SNAPSHOT_VERSION,
  summaryStatistics,
};

function runComparison(label, compare, markdown, resultsDir) {
  const compareScript = join(import.meta.dirname, 'compare-bench.mjs');
  const localBaseline = join(resultsDir, `${compare}.json`);
  const compareArgs = [
    compareScript,
    existsSync(localBaseline) ? localBaseline : compare,
    join(resultsDir, `${label}.json`),
  ];
  if (markdown) compareArgs.push(`--markdown=${markdown}`);
  execFileSync(process.execPath, compareArgs, { stdio: 'inherit' });
}

export function childRunArguments(argv) {
  return argv.filter(
    (argument) =>
      argument !== '--' &&
      !argument.startsWith('--runs=') &&
      !argument.startsWith('--label=') &&
      !argument.startsWith('--compare=') &&
      !argument.startsWith('--markdown=') &&
      !argument.startsWith('--childRun') &&
      !argument.startsWith('--child-run') &&
      !argument.startsWith('--runIndex=') &&
      !argument.startsWith('--run-index=')
  );
}

export async function main(argv = process.argv.slice(2)) {
  const args = resolveBenchmarkArgs(argv);
  const dir = args.dir ? resolve(args.dir) : DEFAULT_DIR;
  const corpus = selectCorpus(args, dir);
  if (args.profile && !args.case && corpus.length !== 1) {
    throw new Error(
      '--profile requires exactly one selected fixture (--only or --case)'
    );
  }

  console.log(
    `benchmark configuration: mode=${args.mode}, reliability=${
      MODES[args.mode].reliability
    }, warmup=${args.warmup}, samples=${args.iters}, runs=${args.runs}, ` +
      `seed=${args.seed}, corpus=${corpus.length}, NODE_ENV=${process.env.NODE_ENV}`
  );
  console.log(`results: ${args.resultsDir}`);

  if (args.runs > 1 && !args.childRun) {
    const forwarded = childRunArguments(argv);
    const snapshots = [];
    for (let run = 1; run <= args.runs; run++) {
      const label = `${args.label}-${run}`;
      execFileSync(
        process.execPath,
        [
          import.meta.filename,
          ...forwarded,
          `--label=${label}`,
          '--runs=1',
          `--run-index=${run}`,
          '--child-run',
        ],
        { stdio: 'inherit', env: process.env }
      );
      snapshots.push(
        JSON.parse(readFileSync(join(args.resultsDir, `${label}.json`), 'utf8'))
      );
    }
    const aggregate = aggregateSnapshots(snapshots, args.label, args);
    if (args.compare) {
      runComparison(args.label, args.compare, args.markdown, args.resultsDir);
    }
    return aggregate;
  }

  const snapshot = await runOnce(
    args,
    corpus,
    createBenchmarkProcessor(args)(),
    args.label,
    args.runIndex
  );
  writeFileSync(
    join(args.resultsDir, `${args.label}.json`),
    JSON.stringify(snapshot, null, 2)
  );
  console.log(`wrote ${join(args.resultsDir, `${args.label}.json`)}`);
  if (args.compare)
    runComparison(args.label, args.compare, args.markdown, args.resultsDir);
  return snapshot;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
