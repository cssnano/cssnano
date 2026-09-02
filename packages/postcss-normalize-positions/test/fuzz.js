import assert from 'node:assert/strict';
import test from 'node:test';
import { check, outputFor, report } from '../script/lib/fuzzCheck.js';
import {
  branches,
  collisionCases,
  generate,
} from '../script/lib/fuzzGenerate.js';

const casesPerSeed = 360;
const requiredFeatures = [
  'boundary:slash',
  'context:background-components',
  'layers:multiple',
  'property:-webkit-perspective-origin',
  'property:background',
  'property:background-position',
  'property:perspective-origin',
];
for (const seed of [1, 2]) {
  test(`matches the independent legacy oracle, seed ${seed}`, () => {
    const seenBranches = new Set();
    const semanticValues = new Set();
    const seenFeatures = new Set();
    let index = 0;
    for (const sample of generate(seed, casesPerSeed)) {
      seenBranches.add(sample.branch);
      semanticValues.add(sample.semanticKey);
      for (const feature of sample.features) seenFeatures.add(feature);
      const failure = check(sample.css, sample.branch);
      assert.equal(failure, undefined, failure && report(failure, seed, index));
      index++;
    }
    assert.deepEqual(
      [...branches]
        .filter((branch) =>
          [...seenBranches].some((seen) => seen.startsWith(branch))
        )
        .toSorted(),
      [...branches].toSorted()
    );
    assert.ok(
      semanticValues.size >= 60,
      `expected 60 semantic shapes, got ${semanticValues.size}`
    );
    assert.deepEqual(
      requiredFeatures,
      requiredFeatures.filter((feature) => seenFeatures.has(feature))
    );
  });
}

test('preserves deliberate role-collision cases', () => {
  for (const { css, expected, feature } of collisionCases)
    assert.equal(outputFor(css), expected, feature);
});
