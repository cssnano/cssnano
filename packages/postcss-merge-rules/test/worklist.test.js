import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import runWorklist, { comesBefore } from '../src/lib/worklist.js';

const STATS_PREFIX = 'postcss-merge-rules stats ';

/**
 * Runs `callback` with worklist diagnostics enabled and returns every stats
 * report it emitted, restoring the environment and console afterwards.
 *
 * @param {() => void} callback
 * @return {Record<string, number>[]}
 */
function collectStats(callback) {
  const previousEnvironment = process.env.CSSNANO_MERGE_RULES_STATS;
  const previousError = console.error;
  const messages = [];
  process.env.CSSNANO_MERGE_RULES_STATS = '1';
  console.error = (message) => messages.push(message);

  try {
    callback();
  } finally {
    console.error = previousError;
    if (previousEnvironment === undefined)
      delete process.env.CSSNANO_MERGE_RULES_STATS;
    else process.env.CSSNANO_MERGE_RULES_STATS = previousEnvironment;
  }

  return messages
    .filter((entry) => entry.startsWith(STATS_PREFIX))
    .map((entry) => JSON.parse(entry.slice(STATS_PREFIX.length)));
}

/**
 * Builds the active-rule bookkeeping for one rule in a sibling chain.
 *
 * @param {number} sourceOrder
 * @param {string} contentKey
 * @param {import('postcss').Rule | null} previous
 * @param {import('postcss').Rule | null} next
 */
function activeEntry(sourceOrder, contentKey, previous, next) {
  return { version: 1, sourceOrder, contentKey, active: true, previous, next };
}

/**
 * Drives the worklist over three adjacent rules whose first equal-declaration
 * rewrite folds `.a` into `.b`; later rewrites find nothing to merge.
 *
 * @param {{movedAcrossParents: boolean}} rewrite
 * @return {Record<string, number>}
 */
function runThreeRuleRewrite({ movedAcrossParents }) {
  const root = postcss.root();
  const first = postcss.rule({ selector: '.a' });
  const second = postcss.rule({ selector: '.b' });
  const third = postcss.rule({ selector: '.c' });
  const active = new WeakMap([
    [first, activeEntry(0, 'a', null, second)],
    [second, activeEntry(1, 'b', first, third)],
    [third, activeEntry(2, 'c', second, null)],
  ]);
  let declarationMerges = 0;

  const [stats] = collectStats(() =>
    runWorklist(root, {
      active,
      hasPossibleSharedDeclaration: () => true,
      estimatedBenefit: () => 1,
      seed: () => first,
      isCurrentCandidate: () => true,
      canMerge: () => true,
      mergeParents: () => false,
      repairMove: () => {},
      mergeMatchingDeclarations: () => {
        declarationMerges++;
        return declarationMerges === 1
          ? {
              previous: null,
              replacements: [second],
              next: third,
              movedAcrossParents,
              kind: 'equal-declaration',
            }
          : null;
      },
      mergeMatchingSelectors: () => null,
      captureBoundaries: () => new Map(),
      partialMerge: () => ({ rule: second, replacements: [], replaced: [] }),
      installPartialMerge: () => null,
      refresh: (rule) => active.get(rule),
    })
  );
  assert.ok(stats);
  return stats;
}

test('should use candidate insertion order as the final heap tie-breaker', () => {
  const candidate = {
    first: postcss.rule({ selector: '.a' }),
    second: postcss.rule({ selector: '.b' }),
    firstVersion: 1,
    secondVersion: 1,
    benefit: 1,
    firstSourceOrder: 0,
    contentKey: 'same',
    edgeKey: '0:1|1:1',
  };

  assert.equal(
    comesBefore(
      { ...candidate, candidateId: 0 },
      { ...candidate, candidateId: 1 }
    ),
    true
  );
  assert.equal(
    comesBefore(
      { ...candidate, candidateId: 1 },
      { ...candidate, candidateId: 0 }
    ),
    false
  );
});

test('should report worklist diagnostics when enabled', () => {
  const [stats] = collectStats(() => {
    const result = postcss([plugin]).process(
      '.a{color:red}.b{color:red;font-weight:bold}.c{font-weight:bold}',
      { from: undefined }
    );
    assert.equal(result.css, '.a,.b{color:red}.b,.c{font-weight:bold}');
  });

  assert.ok(stats);
  assert.equal(stats.initialSeeds, 1);
  assert.ok(stats.candidatePushes >= stats.candidatePops);
  assert.ok(stats.peakHeapSize >= 1);
  assert.ok(stats.canMergeCalls <= stats.candidatePops);
  assert.ok(
    stats.successfulEqualDeclarationRewrites +
      stats.successfulPartialRewrites >=
      1
  );
});

test('should suppress duplicate edges exposed by a neighboring rewrite', () => {
  const stats = runThreeRuleRewrite({ movedAcrossParents: false });
  assert.ok(stats.duplicateEdgeSuppressions > 0);
});

test('should drop queued edges on a global reseed so they can be queued again', () => {
  // A rewrite that moves a rule across parents requests a global reseed,
  // which clears the queued-edge set and must allow the same rule pairs to
  // be queued again.
  const stats = runThreeRuleRewrite({ movedAcrossParents: true });
  assert.equal(stats.globalReseeds, 1);
  // Both edges are queued before the reseed and again after it; only the
  // duplicate exposed by the rewrite itself is suppressed.
  assert.equal(stats.localEdgesQueued, 4);
  assert.equal(stats.duplicateEdgeSuppressions, 1);
});

test('should converge on a bounded deterministic rewrite corpus', () => {
  const inputs = Array.from({ length: 12 }, (_, index) => {
    const suffix = String(index);
    return [
      `.a${suffix}{color:red;color:red;font-weight:bold}`,
      `.b${suffix}{color:red;display:grid;gap:1rem}`,
      `.c${suffix}{/*!keep-${suffix}*/color:red;display:grid}`,
      `@media x{.d${suffix}{font-weight:bold;margin:0}}`,
      `@media x{.e${suffix}{font-weight:bold;padding:0}}`,
    ].join('');
  });

  const diagnostics = collectStats(() => {
    for (const input of inputs) {
      const first = postcss([plugin]).process(input, { from: undefined }).css;
      const second = postcss([plugin]).process(first, {
        from: undefined,
      }).css;
      assert.equal(second, first);
      assert.ok(first.length <= input.length);
      assert.equal(
        (first.match(/\/\*!/gv) ?? []).length,
        (input.match(/\/\*!/gv) ?? []).length
      );
    }
  });

  assert.equal(diagnostics.length, inputs.length * 2);
  assert.ok(diagnostics.every((stats) => stats.candidatePops < 1000));
});
