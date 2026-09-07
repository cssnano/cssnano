// Compare versioned benchmark snapshots using paired process replicates.

import { writeFileSync } from 'node:fs';
import {
  BOOTSTRAP_RESAMPLES,
  bootstrapConfidenceInterval,
  pairedPercentChange,
  quantile,
} from './bench-stats.mjs';
import { loadSnapshot } from './compare-snapshot-io.mjs';
import { compareSnapshots } from './compare-snapshots.mjs';
import { markdownComparison, printComparison } from './compare-report.mjs';

export {
  BOOTSTRAP_RESAMPLES,
  bootstrapConfidenceInterval,
  compareSnapshots,
  loadSnapshot,
  markdownComparison,
  pairedPercentChange,
  printComparison,
  quantile,
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

async function main() {
  const args = cliArgs(process.argv.slice(2));
  if (!args.base || !args.candidate) {
    throw new Error(
      'usage: node util/benchmark/compare-bench.mjs <baseline> <candidate> [--markdown=path] [--allow-output-hash=fixture,base-hash,candidate-hash]'
    );
  }
  const result = compareSnapshots(
    loadSnapshot(args.base),
    loadSnapshot(args.candidate),
    { outputHashAllowlist: args.outputHashAllowlist }
  );
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
