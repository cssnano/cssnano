import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultTargetsQuery,
  resolveTargets,
} from '../../packages/cssnano/src/utils/browserTargets.js';
import { resolvePlaygroundTargets } from '../util/playgroundTargets.js';

test('the playground targets are the cssnano default targets', () => {
  assert.deepEqual(
    resolvePlaygroundTargets(),
    browserslistOf(defaultTargetsQuery)
  );
});

test('the playground targets resolve to themselves, so the browser reads the same versions the build resolved', () => {
  const targets = resolvePlaygroundTargets();
  assert.deepEqual(browserslistOf(targets).toSorted(), targets.toSorted());
});

/** @param {string | string[]} query */
function browserslistOf(query) {
  return [...resolveTargets({ overrideBrowserslist: query }, undefined)];
}
