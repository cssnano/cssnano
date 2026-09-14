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
