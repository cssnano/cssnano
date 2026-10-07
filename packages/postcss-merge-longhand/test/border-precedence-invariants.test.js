import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  allPhysicalBorderProperties,
  getLevel,
} from '../src/lib/decl/borderData.js';
import { setsLonghands } from '../src/lib/spec.js';

test('a border property of a lower level that overlaps a higher-level one sets every longhand the higher-level one sets', () => {
  const violations = [];
  for (const earlier of allPhysicalBorderProperties) {
    const earlierSets = setsLonghands(earlier);
    for (const later of allPhysicalBorderProperties) {
      const laterSets = setsLonghands(later);
      const intersects = [...earlierSets].some((p) => laterSets.has(p));
      const isNarrower =
        /** @type {number} */ (getLevel(earlier)) >
        /** @type {number} */ (getLevel(later));
      if (
        intersects &&
        isNarrower &&
        ![...earlierSets].every((p) => laterSets.has(p))
      ) {
        violations.push(`${earlier} / ${later}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});
