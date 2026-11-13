/**
 * Counts the work of the host walk's folds, contexts and comment tokenizations
 * on the framework stylesheets under the default preset, from V8's precise
 * block coverage, so the script patches nothing in `src/`. The tokenizer's
 * calls are not counted: V8 can inline `tokens` and skip its call count, so
 * the count of a call changed between runs of one tree.
 *
 * A call count cannot tell a memo's miss from its hit, since both call the
 * function. A miss is read as the count of the innermost block that holds the
 * statement after the memo's lookup. A marker that matches no block is an
 * error, not a zero.
 *
 * Usage (from packages/cssnano): node script/pipeline/workCounts.js --json
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
 * Each count: the module it is in, the function, and, for a miss, the source
 * text that starts the block that runs only on a miss.
 *
 * @type {Record<string, {module: string, fn: string, miss?: string}>}
 */
const COUNTED = {
  // The text joined from a token list, the cost C11 adds to.
  tokensTextCalls: { module: 'values/tokensText.js', fn: 'tokensText' },
  // Every fold, whether its memo hit or missed.
  foldCalls: { module: 'pipeline/plan.js', fn: 'foldPlan' },
  // A fold that ran: the memo of the plan missed.
  foldMisses: {
    module: 'pipeline/plan.js',
    fn: 'foldPlan',
    miss: 'const lists = entry.lists;',
  },
  // A container whose context was computed, the cost C13 adds to.
  contextMisses: {
    module: 'pipeline/context.js',
    fn: 'contextOf',
    miss: 'let context = 0;',
  },
  // A comment's text tokenized, the memo C12 removes.
  commentTokenizations: {
    module: 'pipeline/comments/tokenUtils.js',
    fn: 'getTokens',
    miss: 'tokens = tokenize({ css: source });',
  },
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
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @returns {Record<string, number>} the count of each name, summed over the run
 */
function countsOf(coverage) {
  const counts = {};
  for (const [name, { module, fn, miss }] of Object.entries(COUNTED)) {
    let total = 0;
    for (const script of coverage) {
      if (!script.url.endsWith(`/src/${module}`)) continue;
      const source = miss
        ? readFileSync(join(srcDir, module), 'utf8')
        : undefined;
      const offset = miss ? source.indexOf(miss) : -1;
      if (miss && offset === -1) {
        throw new Error(`workCounts: marker of ${name} is not in ${module}`);
      }
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
    counts[name] = total;
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
