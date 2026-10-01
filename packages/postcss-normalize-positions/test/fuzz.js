import assert from 'node:assert/strict';
import test from 'node:test';
import { check, outputFor, report } from '../script/lib/fuzzCheck.js';
import { collisionCases, generate } from '../script/lib/fuzzGenerate.js';

const casesPerSeed = 600;
/* Each pair names the regressions this fuzzer must keep reaching: `top
 * center` once lost its vertical side, and split layers were rewritten. */
const requiredFeatures = [
  'boundary:slash',
  'context:background-components',
  'context:split',
  'layers:multiple',
  'property:-webkit-perspective-origin',
  'property:background',
  'property:background-position',
  'property:perspective-origin',
  'separator:comment',
  'shape:center',
  'shape:center-center',
  'shape:center-coordinate',
  'shape:center-horizontal',
  'shape:center-vertical',
  'shape:coordinate-center',
  'shape:coordinate-vertical',
  'shape:horizontal-center',
  'shape:horizontal-vertical',
  'shape:long-3',
  'shape:long-4',
  'shape:math-center',
  'shape:vertical-center',
  'shape:vertical-coordinate',
  'shape:vertical-horizontal',
  'spelling:escaped',
  'spelling:upper',
  'variable',
];

for (const seed of [1, 2]) {
  test(`keeps every layer's offsets, seed ${seed}`, () => {
    const semanticValues = new Set();
    const seenFeatures = new Set();
    let index = 0;
    for (const sample of generate(seed, casesPerSeed)) {
      semanticValues.add(sample.semanticKey);
      for (const feature of sample.features) seenFeatures.add(feature);
      const failure = check(sample);
      assert.equal(failure, undefined, failure && report(failure, seed, index));
      index++;
    }
    assert.ok(
      semanticValues.size >= 120,
      `expected 120 semantic shapes, got ${semanticValues.size}`
    );
    assert.deepEqual(
      requiredFeatures.filter((feature) => !seenFeatures.has(feature)),
      []
    );
  });
}

test('preserves deliberate role-collision cases', () => {
  for (const { css, expected, feature } of collisionCases)
    assert.equal(outputFor(css), expected, feature);
});
