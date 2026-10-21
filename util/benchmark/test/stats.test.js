import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalQuantile, studentTQuantile } from '../distributions.js';
import {
  createComparisonSchedule,
  crossoverFit,
  decide,
  median,
  randomFor,
  scheduleBalance,
  seedNumber,
} from '../stats.js';

const COMPARISON_SEED_FOR_TESTS = 'cssnano-benchmark-v3';

test('deterministic random generator is reproducible from a seed', () => {
  const gen1 = randomFor('test-seed');
  const gen2 = randomFor('test-seed');
  const numbers1 = Array.from({ length: 5 }, () => gen1());
  const numbers2 = Array.from({ length: 5 }, () => gen2());
  assert.deepEqual(numbers1, numbers2);
  assert.equal(seedNumber('test'), seedNumber('test'));
  assert.notEqual(seedNumber('test'), seedNumber('other'));
});

function streamOffsets(seed) {
  const first = randomFor(String(seed));
  const second = randomFor(String(seed + 1));
  return Array.from({ length: 64 }, () => {
    const difference = second() - first();
    return difference - Math.floor(difference);
  });
}

test('neighbouring seeds do not shift their streams by one shared offset, so simulation replicates are independent', () => {
  // With a weak seed hash, stream(seed + 1) is stream(seed) plus the same
  // offset at every position, which makes replicates copies of each other.
  const neighbour = streamOffsets(2654435762);
  const sharedOffsets = streamOffsets(2654435761).filter(
    (offset, index) => Math.abs(offset - neighbour[index]) < 1e-3
  );
  assert.ok(sharedOffsets.length < 8, `${sharedOffsets.length} of 64 repeat`);
});

test('normalQuantile matches standard normal percentiles', () => {
  assert.ok(Math.abs(normalQuantile(0.5)) < 1e-6);
  assert.ok(Math.abs(normalQuantile(0.975) - 1.959964) < 1e-4);
  assert.ok(Math.abs(normalQuantile(0.95) - 1.644854) < 1e-4);
  assert.ok(Math.abs(normalQuantile(0.025) - -1.959964) < 1e-4);
  assert.throws(() => normalQuantile(0), RangeError);
  assert.throws(() => normalQuantile(1), RangeError);
});

test('studentTQuantile matches exact Student t critical values', () => {
  // df = 3, p = 0.975 -> t ≈ 3.1824
  assert.ok(Math.abs(studentTQuantile(0.975, 3) - 3.1824) < 0.005);
  // df = 8, p = 0.975 -> t ≈ 2.3060
  assert.ok(Math.abs(studentTQuantile(0.975, 8) - 2.306) < 0.001);
  // df = 18, p = 0.975 -> t ≈ 2.1009
  assert.ok(Math.abs(studentTQuantile(0.975, 18) - 2.1009) < 0.0001);
  // df = 78, p = 0.975 -> t ≈ 1.9908
  assert.ok(Math.abs(studentTQuantile(0.975, 78) - 1.9908) < 0.0001);
  // df = 18, p = 0.95 -> t ≈ 1.7341
  assert.ok(Math.abs(studentTQuantile(0.95, 18) - 1.7341) < 0.0001);
  // Symmetry
  assert.ok(
    Math.abs(studentTQuantile(0.025, 18) - -studentTQuantile(0.975, 18)) < 1e-10
  );
  assert.equal(studentTQuantile(0.5, 18), 0);
  assert.throws(() => studentTQuantile(0, 10), RangeError);
  assert.throws(() => studentTQuantile(1, 10), RangeError);
  assert.throws(() => studentTQuantile(0.95, 0), RangeError);
});

test('studentTQuantile is exact for the Cauchy distribution at df = 1', () => {
  // Reference t-table values; the series expansion is off by 11% here.
  assert.ok(Math.abs(studentTQuantile(0.975, 1) - 12.7062) < 1e-3);
  assert.ok(Math.abs(studentTQuantile(0.95, 1) - 6.3138) < 1e-3);
  assert.equal(studentTQuantile(0.5, 1), 0);
});

test('studentTQuantile is exact at df = 2', () => {
  assert.ok(Math.abs(studentTQuantile(0.975, 2) - 4.3027) < 1e-3);
  assert.ok(Math.abs(studentTQuantile(0.95, 2) - 2.92) < 1e-3);
  assert.ok(Math.abs(studentTQuantile(0.025, 2) + 4.3027) < 1e-3);
  assert.equal(studentTQuantile(0.5, 2), 0);
});

test('studentTQuantile at df = 4 stays within 0.05% of the t table', () => {
  assert.ok(Math.abs(studentTQuantile(0.975, 4) / 2.7764 - 1) < 5e-4);
  assert.ok(Math.abs(studentTQuantile(0.95, 4) / 2.1318 - 1) < 5e-4);
});

test('studentTQuantile matches the t table at the small df and 99% levels of the first adaptive looks', () => {
  // df 2 to 8 are the looks at 4 to 10 blocks; the series alone is 0.8% low at df 3.
  const table = [
    [0.995, 3, 5.8409],
    [0.995, 4, 4.6041],
    [0.995, 6, 3.7074],
    [0.99, 3, 4.5407],
    [0.99, 5, 3.3649],
    [0.995, 18, 2.8784],
  ];
  for (const [probability, df, expected] of table)
    assert.ok(
      Math.abs(studentTQuantile(probability, df) / expected - 1) < 1e-4,
      `df ${df} p ${probability}`
    );
});

test('median averages the two middle samples of an even count', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

// Blocks alternate their process order, so both strata are present.
function blocksFrom(logRatios) {
  return logRatios.map((logRatio, index) => ({
    logRatio,
    baselineFirst: index % 2 === 0,
  }));
}

// Small deterministic jitter so the residual variance is positive.
function jittered(center, count) {
  return Array.from(
    { length: count },
    (_, index) => center + (index % 2 === 0 ? 0.002 : -0.002)
  );
}

test('decide reports a regression when the interval lies beyond the margin', () => {
  const { verdict } = decide(blocksFrom(jittered(Math.log(1.3), 10)));
  assert.equal(verdict, 'regression');
});

test('decide reports an improvement when the interval lies below the reciprocal margin', () => {
  const { verdict } = decide(blocksFrom(jittered(Math.log(1 / 1.3), 10)));
  assert.equal(verdict, 'improvement');
});

test('decide reports no meaningful change when the equivalence interval lies within the margin', () => {
  const { verdict } = decide(blocksFrom(jittered(0, 10)));
  assert.equal(verdict, 'no-meaningful-change');
});

test('decide is inconclusive when noise leaves every interval wide', () => {
  const { verdict } = decide(blocksFrom([0.3, -0.3, 0.3, -0.3]));
  assert.equal(verdict, 'inconclusive');
});

test('decide is inconclusive when an order interaction blocks a regression', () => {
  // Treatment 0.3 would be a regression, but the order effect 0.1 is beyond
  // the 5% threshold, so the two process orders cannot be pooled.
  const blocks = blocksFrom(jittered(0.3, 10)).map((block) => ({
    ...block,
    logRatio: block.logRatio + (block.baselineFirst ? 0.1 : -0.1),
  }));
  const result = decide(blocks);
  assert.equal(result.orderStable, false);
  assert.equal(result.verdict, 'inconclusive');
});

test('crossoverFit recovers the treatment and order effects of a balanced design', () => {
  const fit = crossoverFit([
    ...[0.039, 0.041, 0.04, 0.038, 0.042].map((logRatio) => ({
      logRatio,
      baselineFirst: true,
    })),
    ...[-0.001, 0.001, 0, -0.002, 0.002].map((logRatio) => ({
      logRatio,
      baselineFirst: false,
    })),
  ]);
  assert.ok(Math.abs(fit.treatment - 0.02) < 1e-6);
  assert.ok(Math.abs(fit.order - 0.02) < 1e-6);
  assert.equal(fit.degreesOfFreedom, 8);
});

test('crossoverFit rejects a comparison that lacks one process order', () => {
  assert.throws(
    () =>
      crossoverFit(
        blocksFrom([0.1, 0.1, 0.1]).map((b) => ({ ...b, baselineFirst: true }))
      ),
    /both process-order strata/v
  );
});

test('crossoverFit rejects a design with no residual degrees of freedom', () => {
  // Two blocks leave df = 0, and a zero residual variance would report a
  // zero-width interval, i.e. perfect precision.
  assert.throws(() => crossoverFit(blocksFrom([0.1, 0.2])), RangeError);
});

test('comparison schedules balance odd and even block counts', () => {
  for (const blockCount of [1, 2, 3, 4, 7, 20]) {
    const schedule = createComparisonSchedule(blockCount, 'balance');
    const { baselineFirst, candidateFirst } = scheduleBalance(schedule);
    assert.equal(baselineFirst + candidateFirst, blockCount);
    assert.ok(Math.abs(baselineFirst - candidateFirst) <= blockCount % 2);
  }
});

test('every prefix of a comparison schedule is balanced to within one block', () => {
  const schedule = createComparisonSchedule(20, COMPARISON_SEED_FOR_TESTS);
  for (let length = 1; length <= schedule.length; length++) {
    const { baselineFirst, candidateFirst } = scheduleBalance(
      schedule.slice(0, length)
    );
    assert.ok(
      Math.abs(baselineFirst - candidateFirst) <= 1,
      `length ${length}`
    );
  }
});

test('comparison schedules are reproducible from the seed', () => {
  assert.deepEqual(
    createComparisonSchedule(12, COMPARISON_SEED_FOR_TESTS),
    createComparisonSchedule(12, COMPARISON_SEED_FOR_TESTS)
  );
});

test('a longer comparison schedule extends a shorter one so interim looks keep their blocks', () => {
  assert.deepEqual(
    createComparisonSchedule(20, COMPARISON_SEED_FOR_TESTS).slice(0, 6),
    createComparisonSchedule(6, COMPARISON_SEED_FOR_TESTS)
  );
});

function leadingOrders(seed) {
  return createComparisonSchedule(20, seed)
    .map((block) => block.processOrder[0])
    .join();
}

test('pair orientation is not a fixed alternation shifted by the seed', () => {
  const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const distinct = new Set(seeds.map(leadingOrders));
  assert.ok(distinct.size > 1);
});
