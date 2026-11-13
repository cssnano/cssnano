/**
 * Counts the work of the host walk's folds, contexts and comment tokenizations
 * on the framework stylesheets under the default preset, from V8's precise
 * block coverage, so the script patches nothing in `src/`. Run it with
 * `--no-opt`: an optimizing compiler can inline a small function and skip its
 * call count, so the count of one tree changed between runs without the flag.
 *
 * A call count cannot tell a memo's miss from its hit, since both call the
 * function. A miss is read as the count of the innermost block that holds the
 * statement after the memo's lookup. A marker that matches no block is an
 * error, not a zero.
 *
 * Usage (from packages/cssnano): node --no-opt script/pipeline/workCounts.js --json
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session } from 'node:inspector/promises';
import postcss from 'postcss';

const srcDir = fileURLToPath(new URL('../../src/', import.meta.url));
const frameworksDir = fileURLToPath(
  new URL('../../../../frameworks/', import.meta.url)
);

/**
 * Each count: the parts that make it, each the module it is in, the function,
 * and, for a miss, the source text that starts the block that runs only on a
 * miss. A count is the sum of its parts.
 *
 * @type {Record<string, {module: string, fn: string, miss?: string}[]>}
 */
const COUNTED = {
  // Every tokenization of a text, including those of the build's interning.
  tokenizerCalls: [
    {
      module: '@csstools/css-tokenizer/dist/index.mjs',
      fn: 'tokenize',
    },
  ],
  // The text joined from a token list.
  tokensTextCalls: [{ module: 'values/tokensText.js', fn: 'tokensText' }],
  // Every fold, whether its table hit or missed.
  foldCalls: [{ module: 'pipeline/plan.js', fn: 'foldList' }],
  // A fold that ran: the table of the plan missed.
  foldMisses: [
    {
      module: 'pipeline/plan.js',
      fn: 'foldList',
      miss: 'const buffer = new ValueBuffer(undefined, entry.mode, shared);',
    },
  ],
  // A block that holds a declaration, once per longhand round that reads it.
  longhandBlocks: [
    {
      module: 'passes/merge/lib/longhand/canonicalize.js',
      fn: 'processContainer',
    },
  ],
  // A container whose context the record walk computes, once per container.
  recordContexts: [{ module: 'pipeline/context.js', fn: 'recordContextOf' }],
};

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: true,
});

const { default: preset } = await import('../../src/presets/default.js');
await session.post('Profiler.takePreciseCoverage');

/**
 * @param {import('node:inspector').Profiler.CoverageRange[]} ranges the ranges of a function, its own first
 * @param {number} offset
 * @returns {import('node:inspector').Profiler.CoverageRange} the innermost range that holds the offset
 */
function innermostBlock(ranges, offset) {
  let block = ranges[0];
  for (const range of ranges) {
    const holds = range.startOffset <= offset && offset < range.endOffset;
    const inner =
      range.endOffset - range.startOffset < block.endOffset - block.startOffset;
    if (holds && inner) block = range;
  }
  return block;
}

/**
 * @param {string} name the count the part belongs to, for the error of a marker
 * @param {{module: string, fn: string, miss?: string}} part
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @returns {number} the calls of the part's function, or of its miss block
 */
function partCount(name, { module, fn, miss }, coverage) {
  const source = miss ? readFileSync(join(srcDir, module), 'utf8') : undefined;
  const offset = miss ? source.indexOf(miss) : -1;
  if (miss && offset === -1) {
    throw new Error(`workCounts: marker of ${name} is not in ${module}`);
  }
  let total = 0;
  for (const script of coverage) {
    if (!script.url.endsWith(`/${module}`)) continue;
    for (const callee of script.functions) {
      if (callee.functionName !== fn) continue;
      if (!miss) {
        total += callee.ranges[0].count;
        continue;
      }
      // The innermost block that holds the marker is the miss path: the
      // block after the memo's early return starts at the return's end.
      total += innermostBlock(callee.ranges, offset).count;
    }
  }
  return total;
}

/**
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @returns {Record<string, number>} the count of each name, summed over the run
 */
function countsOf(coverage) {
  const counts = {};
  for (const [name, parts] of Object.entries(COUNTED)) {
    counts[name] = parts.reduce(
      (total, part) => total + partCount(name, part, coverage),
      0
    );
  }
  return counts;
}

// The take drops the calls the imports made.
const json = process.argv.includes('--json');
const totals = {};
for (const file of readdirSync(frameworksDir).toSorted()) {
  const css = readFileSync(join(frameworksDir, file), 'utf8');
  await postcss(preset()).process(css, { from: undefined });
  const { result } = await session.post('Profiler.takePreciseCoverage');
  for (const [name, count] of Object.entries(countsOf(result))) {
    totals[name] = (totals[name] ?? 0) + count;
  }
}
await session.post('Profiler.stopPreciseCoverage');
session.disconnect();

if (json) {
  console.log(JSON.stringify(totals, null, 2));
} else {
  for (const [name, count] of Object.entries(totals)) {
    console.log(`${name}\t${count}`);
  }
}
