import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foldCandidateBefore } from '../src/lib/normalizeArena.js';
import { normalizeList } from '../src/lib/selectorScanner.js';

function candidate(overrides = {}) {
  const values = {
    savings: 10,
    count: 3,
    lex: '.m',
    order: 4,
    position: 2,
    sequence: 7,
    ...overrides,
  };
  return {
    savings: values.savings,
    count: values.count,
    lex: values.lex,
    version: 0,
    first: {
      selector: { order: values.order },
      position: values.position,
    },
    group: { sequence: values.sequence },
  };
}

test('unsorted fold priority compares list position, fold position, then creation sequence', () => {
  const reference = candidate();
  assert.equal(
    foldCandidateBefore(false, candidate({ order: 3 }), reference),
    true
  );
  assert.equal(
    foldCandidateBefore(false, candidate({ position: 1 }), reference),
    true
  );
  assert.equal(
    foldCandidateBefore(false, candidate({ sequence: 6 }), reference),
    true
  );
  assert.equal(
    foldCandidateBefore(false, candidate({ savings: 100 }), reference),
    false
  );
});

test('sorted fold priority compares savings, count, lexical text, position, then creation sequence', () => {
  const reference = candidate();
  for (const overrides of [
    { savings: 11 },
    { count: 4 },
    { lex: '.a' },
    { position: 1 },
    { sequence: 6 },
  ])
    assert.equal(
      foldCandidateBefore(true, candidate(overrides), reference),
      true
    );
});

test('savings-first folding invalidates overlapping groups deterministically', () => {
  const input = '.long .x,.long .y,.a .x,.b .x';
  assert.equal(normalizeList(input), '.long .y,:is(.a,.b,.long) .x');
  assert.equal(
    normalizeList(normalizeList(input)),
    '.long .y,:is(.a,.b,.long) .x'
  );
});
