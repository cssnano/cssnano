import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
      // Only the first merge moves a rule, as a real cross-parent merge does.
      mergeParents: () => movedAcrossParents && declarationMerges === 0,
      repairMove: () => {},
      mergeMatchingDeclarations: () => {
        declarationMerges++;
        return declarationMerges === 1
          ? {
              previous: null,
              replacements: [second],
              next: third,
              kind: 'equal-declaration',
            }
          : null;
      },
      mergeMatchingSelectors: () => null,
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

const pluginUrl = new URL('../src/index.js', import.meta.url).href;

/**
 * Runs the plugin on every input in one child process under a time and heap
 * limit. The worklist loop is synchronous, so a `node:test` timeout cannot
 * interrupt a runaway merge and an out-of-memory crash would take down the
 * whole test runner. The child prints each input's index before processing it,
 * so a hang or crash is attributed to the last input started.
 *
 * @param {string[]} inputs
 * @return {{css: string[], terminated: boolean, stuckOn: string | undefined}}
 */
function processAllWithLimits(inputs) {
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const inputs = ${JSON.stringify(inputs)};
    inputs.forEach((css, index) => {
      process.stdout.write(index + '\\n');
      process.stdout.write(JSON.stringify(postcss([plugin]).process(css, {from: undefined}).css) + '\\n');
    });
  `;
  const result = spawnSync(
    process.execPath,
    ['--max-old-space-size=256', '--input-type=module', '-e', script],
    { timeout: 30_000, encoding: 'utf8', cwd: new URL('..', import.meta.url) }
  );
  const lines = (result.stdout ?? '').split('\n').filter(Boolean);
  const css = lines
    .filter((_, index) => index % 2 === 1)
    .map((line) => JSON.parse(line));
  const terminated = result.status !== 0;
  return {
    css,
    terminated,
    stuckOn: terminated ? inputs[css.length] : undefined,
  };
}

/** @param {string} css */
function processWithLimits(css) {
  const { css: outputs, terminated } = processAllWithLimits([css]);
  return { css: outputs[0], terminated };
}

const crossParentMoveThenAnotherMove = [
  [
    'an @layer statement',
    '@media print{.c{top:0;color:red}}@layer x;@media print{.a{color:red}.b{}}',
  ],
  [
    'an @font-face rule',
    '@media print{.c{top:0;color:red}}@font-face{font-family:x}@media print{.a{color:red}.b{}}',
  ],
  [
    'two @page rules',
    '@media print{.c{top:0;color:red}}@page{margin:0}@page :first{margin:1px}@media print{.a{color:red}.b{}}',
  ],
];

for (const [separator, css] of crossParentMoveThenAnotherMove) {
  test(`should terminate on a merge after a cross-parent move followed by another move into the same block, separated by ${separator}`, () => {
    const result = processWithLimits(css);
    assert.equal(result.terminated, false);
  });
}

test('should merge the shared declaration after a cross-parent move followed by another move into the same block', () => {
  assert.equal(
    processWithLimits(crossParentMoveThenAnotherMove[0][1]).css,
    '@media print{.c{top:0}.c,.a{color:red}.b{}}@layer x;@media print{}'
  );
});

/** Park–Miller generator; the products stay below Number.MAX_SAFE_INTEGER. @param {number} seed */
function randomSource(seed) {
  let state = seed % 2_147_483_647 || 1;
  return () => {
    state = (state * 48_271) % 2_147_483_647;
    return state / 2_147_483_647;
  };
}

/** Generates equal @media blocks split by non-rule at-rules, sharing a declaration. */
function generateSplitMediaCase(random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const separators = [
    '',
    '@layer x;',
    '@font-face{font-family:x}',
    '@page{margin:0}',
  ];
  const rules = [
    () => '.c{top:0;color:red}',
    () => '.a{color:red}',
    () => '.b{}',
    () => '.d{color:red;left:0}',
    () => '.e{top:0}',
  ];
  // Equal conditional blocks are the only ones the plugin joins, so each
  // case repeats one wrapper.
  const wrapper = pick(['@media print', '@supports (color:red)']);
  const blocks = 2 + Math.floor(random() * 3);
  let css = '';
  for (let block = 0; block < blocks; block++) {
    const body = Array.from({ length: 1 + Math.floor(random() * 3) }, () =>
      pick(rules)()
    ).join('');
    css += `${wrapper}{${body}}${pick(separators)}`;
  }
  return css;
}

test('should terminate on generated equal @media blocks separated by non-rule at-rules', () => {
  const random = randomSource(0x5eed);
  const inputs = Array.from({ length: 12 }, () =>
    generateSplitMediaCase(random)
  );
  assert.equal(processAllWithLimits(inputs).stuckOn, undefined);
});
