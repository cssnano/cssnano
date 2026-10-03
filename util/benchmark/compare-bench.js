// Reanalyze a saved paired-comparison artifact and print its report.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  analyzeComparison,
  validateComparisonArtifact,
} from './compare-analysis.js';
import { parseAllowOutputHash } from './compare-validation.js';
import { markdownComparison, printComparison } from './compare-report.js';

function cliArgs(argv) {
  let artifact;
  let markdown;
  const outputHashAllowlist = new Map();
  for (const arg of argv.filter((value) => value !== '--')) {
    if (arg.startsWith('--markdown='))
      markdown = arg.slice('--markdown='.length);
    else if (arg.startsWith('--allow-output-hash=')) {
      parseAllowOutputHash(
        arg.slice('--allow-output-hash='.length),
        outputHashAllowlist
      );
    } else if (artifact === undefined) artifact = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  return { artifact, markdown, outputHashAllowlist };
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
  if (!args.artifact) {
    throw new Error(
      'usage: node util/benchmark/compare-bench.js <comparison-artifact> [--markdown=path]'
    );
  }
  const result = loadComparison(args.artifact, {
    outputHashAllowlist: args.outputHashAllowlist,
  });
  printComparison(result);
  if (args.markdown) writeFileSync(args.markdown, markdownComparison(result));
}

const isMain = process.argv[1] && process.argv[1].endsWith('/compare-bench.js');
if (isMain) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
