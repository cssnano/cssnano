import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createComparisonSchedule,
  scheduleBalance,
} from './comparison-schedule.mjs';

test('comparison schedules balance odd and even block counts', () => {
  for (const count of [4, 5, 20]) {
    const balance = scheduleBalance(createComparisonSchedule(count, 'seed'));
    assert.ok(Math.abs(balance.baselineFirst - balance.candidateFirst) <= 1);
  }
});

test('comparison schedules derive their alternating start from the seed', () => {
  const first = createComparisonSchedule(6, 'seed');
  assert.deepEqual(createComparisonSchedule(6, 'seed'), first);
  assert.deepEqual(first[0].processOrder, ['baseline', 'candidate']);
  assert.deepEqual(first[1].processOrder, ['candidate', 'baseline']);
  assert.notEqual(
    createComparisonSchedule(6, 'b')[0].processOrder[0],
    first[0].processOrder[0]
  );
  assert.equal(
    createComparisonSchedule(6, 'b')[1].processOrder[0],
    first[0].processOrder[0]
  );
});

test('block-pair randomization randomizes pair order while maintaining pair balance', () => {
  const schedule = createComparisonSchedule(20, 'randomization-test-seed');
  let baselineFirstPairs = 0;
  let candidateFirstPairs = 0;
  for (let pair = 0; pair < 10; pair++) {
    const b1 = schedule[pair * 2];
    const b2 = schedule[pair * 2 + 1];
    // Each pair must contain exactly one baseline-first and one candidate-first
    assert.notEqual(b1.processOrder[0], b2.processOrder[0]);
    if (b1.processOrder[0] === 'baseline') baselineFirstPairs++;
    else candidateFirstPairs++;
  }
  // Both pair orientations should occur across 10 pairs (not purely static alternating)
  assert.ok(baselineFirstPairs > 0);
  assert.ok(candidateFirstPairs > 0);
});
