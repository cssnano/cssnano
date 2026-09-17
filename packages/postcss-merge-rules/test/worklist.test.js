import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import runWorklist, { comesBefore } from '../src/lib/worklist.js';

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
  const previousEnvironment = process.env.CSSNANO_MERGE_RULES_STATS;
  const previousError = console.error;
  const messages = [];
  process.env.CSSNANO_MERGE_RULES_STATS = '1';
  console.error = (message) => messages.push(message);

  try {
    const result = postcss([plugin]).process(
      '.a{color:red}.b{color:red;font-weight:bold}.c{font-weight:bold}',
      { from: undefined }
    );
    assert.equal(result.css, '.a,.b{color:red}.b,.c{font-weight:bold}');
  } finally {
    console.error = previousError;
    if (previousEnvironment === undefined)
      delete process.env.CSSNANO_MERGE_RULES_STATS;
    else process.env.CSSNANO_MERGE_RULES_STATS = previousEnvironment;
  }

  const message = messages.find((entry) =>
    entry.startsWith('postcss-merge-rules stats ')
  );
  assert.ok(message);
  const stats = JSON.parse(message.slice('postcss-merge-rules stats '.length));
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
  const root = postcss.root();
  const first = postcss.rule({ selector: '.a' });
  const second = postcss.rule({ selector: '.b' });
  const third = postcss.rule({ selector: '.c' });
  const active = new WeakMap([
    [
      first,
      {
        version: 1,
        sourceOrder: 0,
        contentKey: 'a',
        active: true,
        previous: null,
        next: second,
      },
    ],
    [
      second,
      {
        version: 1,
        sourceOrder: 1,
        contentKey: 'b',
        active: true,
        previous: first,
        next: third,
      },
    ],
    [
      third,
      {
        version: 1,
        sourceOrder: 2,
        contentKey: 'c',
        active: true,
        previous: second,
        next: null,
      },
    ],
  ]);
  let declarationMerges = 0;
  const previousEnvironment = process.env.CSSNANO_MERGE_RULES_STATS;
  const previousError = console.error;
  const messages = [];
  process.env.CSSNANO_MERGE_RULES_STATS = '1';
  console.error = (message) => messages.push(message);

  try {
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
              movedAcrossParents: false,
              kind: 'equal-declaration',
            }
          : null;
      },
      mergeMatchingSelectors: () => null,
      captureBoundaries: () => new Map(),
      partialMerge: () => ({ rule: second, replacements: [], replaced: [] }),
      installPartialMerge: () => null,
      refresh: (rule) => active.get(rule),
    });
  } finally {
    console.error = previousError;
    if (previousEnvironment === undefined)
      delete process.env.CSSNANO_MERGE_RULES_STATS;
    else process.env.CSSNANO_MERGE_RULES_STATS = previousEnvironment;
  }

  const message = messages.find((entry) =>
    entry.startsWith('postcss-merge-rules stats ')
  );
  assert.ok(message);
  const stats = JSON.parse(message.slice('postcss-merge-rules stats '.length));
  assert.ok(stats.duplicateEdgeSuppressions > 0);
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
  const previousEnvironment = process.env.CSSNANO_MERGE_RULES_STATS;
  const previousError = console.error;
  const messages = [];
  process.env.CSSNANO_MERGE_RULES_STATS = '1';
  console.error = (message) => messages.push(message);

  try {
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
  } finally {
    console.error = previousError;
    if (previousEnvironment === undefined)
      delete process.env.CSSNANO_MERGE_RULES_STATS;
    else process.env.CSSNANO_MERGE_RULES_STATS = previousEnvironment;
  }

  const diagnostics = messages
    .filter((entry) => entry.startsWith('postcss-merge-rules stats '))
    .map((entry) =>
      JSON.parse(entry.slice('postcss-merge-rules stats '.length))
    );
  assert.equal(diagnostics.length, inputs.length * 2);
  assert.ok(diagnostics.every((stats) => stats.candidatePops < 1000));
});
