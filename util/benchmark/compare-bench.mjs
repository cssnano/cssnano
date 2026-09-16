// Compare versioned benchmark snapshots using independent process samples.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  BOOTSTRAP_RESAMPLES,
  bootstrapConfidenceInterval,
  clusteredTwoSampleBootstrapConfidenceInterval,
  percentChange,
  pairedPercentChange,
  quantile,
  twoSampleBootstrapConfidenceInterval,
} from './bench-stats.mjs';
import { loadSnapshot } from './compare-snapshot-io.mjs';
import {
  analyzeComparison,
  analyzePairedComparison,
  validateComparisonArtifact,
} from './compare-analysis.mjs';
import {
  analyzeIndependentSnapshots,
  compareSnapshots,
} from './compare-snapshots.mjs';
import { markdownComparison, printComparison } from './compare-report.mjs';

export {
  BOOTSTRAP_RESAMPLES,
  bootstrapConfidenceInterval,
  clusteredTwoSampleBootstrapConfidenceInterval,
  compareSnapshots,
  analyzeComparison,
  analyzePairedComparison,
  analyzeIndependentSnapshots,
  loadComparison,
  loadSnapshot,
  markdownComparison,
  percentChange,
  pairedPercentChange,
  printComparison,
  quantile,
  twoSampleBootstrapConfidenceInterval,
};

function cliArgs(argv) {
  const positional = [];
  let markdown;
  const outputHashAllowlist = new Map();
  for (const arg of argv.filter((value) => value !== '--')) {
    if (arg.startsWith('--markdown='))
      markdown = arg.slice('--markdown='.length);
    else if (arg.startsWith('--allow-output-hash=')) {
      const value = arg.slice('--allow-output-hash='.length);
      const [name, base, candidate, extra] = value.split(',');
      if (!name || !base || !candidate || extra !== undefined) {
        throw new Error(
          '--allow-output-hash must be fixture,base-hash,candidate-hash'
        );
      }
      if (outputHashAllowlist.has(name)) {
        throw new Error(`duplicate output hash allowlist entry for "${name}"`);
      }
      outputHashAllowlist.set(name, { base, candidate });
    } else positional.push(arg);
  }
  return {
    base: positional[0],
    candidate: positional[1],
    markdown,
    outputHashAllowlist,
  };
}

function loadComparison(path, options = {}) {
  const artifact = JSON.parse(readFileSync(path, 'utf8'));
  if (artifact.schemaVersion !== 3 || artifact.artifactType !== 'comparison') {
    throw new TypeError('comparison artifact must use schema v3');
  }
  validateComparisonArtifact(artifact, options);
  const analysis = analyzeComparison(artifact, options);
  const baseline = artifact.blocks.find(
    (block) => block.observations?.baseline
  );
  const candidate = artifact.blocks.find(
    (block) => block.observations?.candidate
  );
  return {
    ...analysis,
    blocks: artifact.blocks,
    base: {
      label: 'baseline',
      path,
      preset: artifact.configuration?.preset ?? 'unknown',
      target: artifact.configuration?.target ?? 'cssnano',
      corpusManifest: artifact.corpusHash,
      gitRevision: artifact.gitRevision?.baseline,
      seed: artifact.configuration?.seed,
    },
    candidate: {
      label: 'candidate',
      path,
      preset: artifact.configuration?.preset ?? 'unknown',
      target: artifact.configuration?.target ?? 'cssnano',
      corpusManifest: artifact.corpusHash,
      gitRevision: artifact.gitRevision?.candidate,
      seed: artifact.configuration?.seed,
    },
    maxRSS: null,
    warning: analysis.structuralFailure
      ? 'correctness or process failure; no performance verdict is available'
      : null,
    _observations: { baseline, candidate },
  };
}

async function main() {
  const args = cliArgs(process.argv.slice(2));
  if (!args.base) {
    throw new Error(
      'usage: node util/benchmark/compare-bench.mjs <comparison-artifact> [--markdown=path] or <baseline> <candidate>'
    );
  }
  const result = args.candidate
    ? compareSnapshots(loadSnapshot(args.base), loadSnapshot(args.candidate), {
        outputHashAllowlist: args.outputHashAllowlist,
      })
    : loadComparison(args.base, {
        outputHashAllowlist: args.outputHashAllowlist,
      });
  printComparison(result);
  if (args.markdown) writeFileSync(args.markdown, markdownComparison(result));
}

const isMain =
  process.argv[1] && process.argv[1].endsWith('/compare-bench.mjs');
if (isMain) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
