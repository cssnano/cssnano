import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const presetsDoc = readFileSync(
  new URL('../src/docs/presets.md', import.meta.url),
  'utf8'
);

// The browserslist options that cssnano takes, which the presets guide documents.
const browserslistKeys = ['query', 'env', 'stats'];

describe('presets documentation', () => {
  test('names the browserslist option in backticks', () => {
    assert.ok(presetsDoc.includes('`browserslist`'));
  });

  for (const key of browserslistKeys) {
    test(`names the browserslist.${key} option in backticks`, () => {
      assert.ok(presetsDoc.includes(`\`browserslist.${key}\``));
    });
  }
});
