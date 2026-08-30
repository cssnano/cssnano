import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { requiredSupport } from '../src/lib/isFallback.js';

test('recognizes escaped support-dependent function names', () => {
  const declaration = postcss.decl({ value: 'v\\61r(--value)' });

  assert.deepEqual(requiredSupport(declaration), new Set(['var']));
});
